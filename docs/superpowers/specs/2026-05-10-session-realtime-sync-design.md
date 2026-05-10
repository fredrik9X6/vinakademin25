# Session Realtime Sync — host pacing + roster + session-mode UI

## Context

The group-session feature today gives guests free course access for the duration of the session, but every participant navigates independently. The host's `currentLesson` pointer exists on `CourseSessions` and is set by some flows but is never broadcast — there is no realtime path from host to participants, no shared sense of "we're tasting together," and the host has no view of where each guest is in the content.

This is Chunk 3 of the group-session UX work. Chunk 1 (status-aware /delta + QR code) shipped 2026-05-09. Chunk 2 (proactive claim email) shipped 2026-05-10. Chunks 1 and 2 hardened existing flows; Chunk 3 introduces the headline UX feature: a synchronous, cohort-feeling tasting where the host paces and participants can either follow or roam.

## Goal

1. Make the session feel synchronous: when the host advances a lesson, every following participant's screen advances with them (with a Roam toggle for participants who want to browse independently).
2. Give every participant a live roster so the experience reads as collective ("we're 5 in this tasting") rather than solo.
3. Replace the marketing-flavored course landing UI with a focused session-mode view for active session participants.
4. Ship without new infrastructure (no Redis, no WebSocket server) — use SSE plus per-connection DB polling. Keep the migration path to pub/sub clean.

Out of scope for v1: quiz / `currentActivity` synchronization, host broadcasts ("everyone look at this wine"), per-participant time-on-lesson tracking, dedicated host dashboard at a separate URL, mobile-specific layouts, fallback to short-poll when SSE is unsupported (modern target browsers all support `EventSource`).

## Design

### 1. Transport: Server-Sent Events with per-connection polling

Each participant page opens a single SSE connection to `GET /api/sessions/[sessionId]/stream`. The endpoint streams three event types:

| Event | Payload | Cadence |
|---|---|---|
| `lesson` | `{ currentLessonId: number \| null }` | Initial frame on connect, then on every change detected by the 2-second poll |
| `roster` | `{ participants: [{ id, nickname, currentLessonId, isHost, online }] }` | Initial frame on connect, then on every change detected by the 5-second poll. Always includes a synthetic entry for the session's host (sourced from `course-sessions.host` + `course-sessions.currentLesson`), even if the host doesn't have a `SessionParticipant` row. The host renders as `online: true` while `session.status === 'active'` — explicit pause/end is the signal we honor for host presence, not heartbeat activity. |
| `heartbeat` | `{ ts: number }` | Every 30 seconds |

Inside the SSE handler, two `setInterval` pollers run for the lifetime of that connection: a 2-second poll on `course-sessions.currentLesson` and a 5-second poll on `session-participants` for the session. Each poller compares the latest result to the last-emitted value and only writes a new event when something changed (plus the initial frame). Heartbeats keep the connection warm through proxies and let the browser detect a dead server faster than its own TCP-level timeout.

`EventSource` reconnects automatically on connection drop. No client-side retry code is needed beyond setting `withCredentials: true` so the participant cookie travels.

There is no pub/sub coordination across Railway instances. Each open connection polls its own DB, and a `currentLesson` change made by the host on instance A propagates to subscribers on instance B because both read the same row. At cohort scale (≤50 simultaneous participants per session), the per-connection polling load is bounded and acceptable.

### 2. Schema change — `SessionParticipants`

One new field, nullable, no default:

| Field | Type | Set by | Read by |
|---|---|---|---|
| `currentLessonId` | `relationship` to `content-items` | The participant's own client via `/participant-state` POST | The SSE roster poller |

`lastActivityAt` already exists. Reused as the liveness signal: any participant with `lastActivityAt > now() - 2 minutes` renders as `online: true` in the roster.

`CourseSessions.currentLesson` already exists. Reused as the host pointer.

Migration: one nullable FK column. Additive, prod-safe.

### 3. APIs

#### `GET /api/sessions/[sessionId]/stream`

Auth: `vk_participant_token` cookie (guests) OR Payload session for an authed user who is the session's host or a participant. Returns 401 otherwise. The roster contains other guests' nicknames, so anonymous subscription is not appropriate.

Returns `Content-Type: text/event-stream` with the three event types above. Closes the stream when:
- The HTTP request is aborted (client disconnect)
- The session reaches `status='completed'` (server-initiated close after sending a final state event)

#### `POST /api/sessions/[sessionId]/participant-state`

Auth: `vk_participant_token` cookie (guests) OR Payload session (authed users). The participant must be a member of this session.

Body (all fields optional):
```json
{ "currentLessonId": 42 }
```

Empty body is allowed and just heartbeats `lastActivityAt`. Called by the participant's client on every lesson page-view AND on a 30-second timer while the page is open.

Returns `{ success: true }` or `401`/`403`/`404` on auth/membership/not-found errors.

#### `POST /api/sessions/[sessionId]/host-state`

Auth: Payload session, must be `session.host` or admin role.

Body:
```json
{ "currentLessonId": 42 }
```

Updates `course-sessions.currentLesson`. The downstream SSE pollers pick up the change within 2 seconds.

Returns `{ success: true }` or `401`/`403`/`404` on auth/host/not-found errors.

### 4. Client components

#### `<RealtimeSync sessionId={...} />`

Mounts once on the session page (inside `SessionView`). Opens an `EventSource` to `/api/sessions/[id]/stream`. On each event:
- `lesson` → updates `SessionContext.hostCurrentLessonId`
- `roster` → updates `SessionContext.roster`
- `heartbeat` → no-op (just the connection keeping itself alive)

Renders nothing. Closes the `EventSource` on unmount.

#### `<SessionView course={...} session={...} />`

The session-mode UI. Replaces the marketing chrome of `CourseOverview` for participants in an active session. Layout:

```
┌─────────────────────────────────────────────────────────┐
│  {course.title}                       [Lämna provning]  │
│  {sessionName}                                          │
│  ─────────────────────────────────────────────────────  │
│                                          ┌────────────┐ │
│   ┌──────────────────────────────────┐   │ Deltagare  │ │
│   │                                  │   │ ● Anna     │ │
│   │   Lesson player (current lesson) │   │   Lektion 3│ │
│   │                                  │   │ ● Lars (du)│ │
│   │                                  │   │   Lektion 2│ │
│   └──────────────────────────────────┘   │ ● Mia      │ │
│                                          │   Lektion 3│ │
│   [Föreg.]  [Följer värden ●]   [Nästa]  └────────────┘ │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │ Innehåll                                         │  │
│   │  • Modul 1                                       │  │
│   │     · Lektion 1                                  │  │
│   │     · Lektion 2  ← du                            │  │
│   │     · Lektion 3  ← Värden                        │  │
│   │  • Modul 2                                       │  │
│   │     ...                                          │  │
│   └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Hidden compared to today's `CourseOverview`:
- Price card and "Köp vinprovning" CTA
- Long course description block
- Instructor bio card
- "Bläddra fler vinprovningar" footer

Kept: lesson player, table of contents, prev/next, Lämna provning button.

Added: roster panel, Follow-host toggle, "du"/"Värden" tags inside the TOC.

Hosts see the same view; no role-specific layout differences. Host-only actions (e.g. ending the session) live in their existing surfaces — out of scope for the SessionView itself.

#### `<SessionRoster />`

Renders the roster panel. Reads from `SessionContext.roster`. Each row: online dot (green if `online`, grey otherwise) + nickname (with `(du)` suffix for the viewer's own row, "Värden" badge for the host) + current lesson title (or "Lobbyn" if `currentLessonId === null`). Sorted: host first, then by `nickname` ascending.

#### `<FollowHostToggle sessionId={...} />`

Pill-shaped toggle. Two states:
- `Följer värden` (filled, green dot, default)
- `Roamar fritt` (outlined)

Persists to `localStorage` key `vk_session_follow_${sessionId}`. Reads back on mount; defaults to `true` (Following) when the key is missing. Flipping back to Following snaps the participant to the host's current lesson immediately.

#### `<HostLessonPin />`

Small badge inside the table-of-contents rows, rendered next to the host's current lesson. Copy: "Värden är här". Helps a roaming participant see where to rejoin.

### 5. Auto-advance logic

Lives in `LessonViewer`. On every render:

```ts
useEffect(() => {
  if (!sessionContext.followingHost) return
  if (sessionContext.hostCurrentLessonId == null) return
  if (sessionContext.hostCurrentLessonId === currentLesson.id) return
  router.push(`/vinprovningar/${course.slug}?lesson=${sessionContext.hostCurrentLessonId}&session=${sessionId}`)
}, [sessionContext.followingHost, sessionContext.hostCurrentLessonId, currentLesson.id, ...])
```

The dependency on `currentLesson.id` ensures the effect re-runs after the navigation completes and the new lesson loads — without a guard, a host on lesson N+2 while the participant is on lesson N would auto-advance once to N+1, then once more to N+2 once N+1 mounts. The current shape handles this in two ticks naturally.

When the host themselves clicks a lesson in their own TOC, two things happen in parallel:
1. Their browser navigates to that lesson via the existing `router.push` flow (unchanged).
2. The host's client also POSTs to `/host-state` with the new `currentLessonId`. The session row updates; SSE picks up the change; followers auto-advance.

These two writes are independent — there's no transactional guarantee that the host arrives at the lesson before participants do. In practice the host's own navigation completes before the SSE round-trip; even if it doesn't, the desync is sub-second.

### 6. SessionContext extensions

```ts
interface SessionData {
  // existing
  sessionId: string
  courseSlug: string
  // new
  followingHost: boolean
  hostCurrentLessonId: number | null
  roster: Array<{
    id: number
    nickname: string
    currentLessonId: number | null
    isHost: boolean
    online: boolean
  }>
}

interface SessionContextValue {
  // existing
  activeSession: SessionData | null
  joinSession(): void
  leaveSession(): Promise<void>
  // new
  setFollowingHost(b: boolean): void
  // (handlers for SSE events live inside the provider; not part of the public API)
}
```

The `RealtimeSync` component lives inside the provider's tree and dispatches into the same context the consumer components read from. No new global state.

### 7. Render-time branching in `CourseOverview`

`CourseOverview` already accepts `isSessionParticipant` and `sessionId` props. It currently renders the marketing chrome unconditionally and lets the lesson viewer take over when a lesson is selected. The change:

```tsx
// pseudocode
if (isSessionParticipant && sessionData?.status === 'active') {
  return <SessionView course={course} session={sessionData} />
}
return <ExistingCourseOverview … />
```

Hosts pass through the same branch (the host of an active session is a session member). The marketing chrome stays the canonical view for non-session visitors and for previewing/buying the course.

### 8. Files touched

```
NEW   src/app/api/sessions/[sessionId]/stream/route.ts             SSE endpoint
NEW   src/app/api/sessions/[sessionId]/participant-state/route.ts  participant heartbeat + lesson update
NEW   src/app/api/sessions/[sessionId]/host-state/route.ts         host pointer update
NEW   src/components/course/SessionView.tsx                        new session-mode layout
NEW   src/components/course/SessionRoster.tsx                      roster panel
NEW   src/components/course/FollowHostToggle.tsx                   participant toggle
NEW   src/components/course/RealtimeSync.tsx                       EventSource wrapper
NEW   src/components/course/HostLessonPin.tsx                      TOC badge
EDIT  src/context/SessionContext.tsx                               extend with follow/host/roster state
EDIT  src/components/course/CourseOverview.tsx                     branch to SessionView for active sessions
EDIT  src/components/course/LessonViewer.tsx                       auto-advance effect
EDIT  src/collections/SessionParticipants.ts                       add currentLessonId relationship
NEW   src/migrations/<ts>_session_participants_current_lesson.ts   one nullable FK column
EDIT  src/migrations/index.ts                                      auto-registered
EDIT  src/payload-types.ts                                         auto-regenerated
```

No existing collections beyond `SessionParticipants` are touched. No changes to the Subscribers / claim-email infrastructure from Chunk 2.

## Testing

This project has no automated test suite. Manual verification per task; the end-to-end pass at the end of the implementation covers:

1. **Single-host scenario.** Host opens the SessionView, advances through three lessons. With a second browser open as a guest who has Followed on, that browser auto-advances on each host move within ~2 seconds.
2. **Roam toggle.** Same setup, guest flips toggle to Roam. Host advances; guest's screen does not move. Guest flips back to Following; guest's screen snaps to host's current lesson.
3. **Roster updates.** Add a third browser. Roster panels in all three browsers show the new participant within ~5 seconds. The new participant's currentLessonId reflects what they're viewing as soon as they navigate.
4. **Disconnect.** Close the third browser. Within ~2 minutes, the other two browsers' rosters mark them offline (online dot turns grey). They re-appear as online when the third browser reconnects.
5. **Session completion.** Host marks the session completed. Both participant browsers receive the final SSE state, the stream closes, and the page rendered for those participants is no longer the SessionView (it falls back to the standard CourseOverview, since `isSessionParticipant` is now false). Coupled with the existing Chunk 2 claim-email flow, this is the natural end state.
6. **Auth boundaries.** Try to POST `/host-state` as a non-host participant — expect 403. Try to POST `/participant-state` as a guest with no cookie — expect 401.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Long-lived SSE connections eat Railway HTTP slots | Cohort sizes are small (≤50 per session, single-digit concurrent sessions). Heartbeats let the platform reap dead connections. If the platform ever signals contention, swap polling for Postgres `LISTEN/NOTIFY` or Redis pub/sub. |
| Per-connection 2-second DB polling at scale | Indexed lookup on a session id; cheap. 50 participants × 1 session × 0.5 RPS = 25 RPS DB load per active session. At 10 simultaneous sessions, 250 RPS — well within Neon plan headroom. |
| `EventSource` not supported (very old browsers, IE) | Out of scope per "Goal" section. The target audience is modern phones and laptops; all evergreens support `EventSource`. |
| Auto-advance is jarring mid-read | The `Roam` toggle is the escape hatch. Default ON because they joined a guided tasting; that's the expected expectation. The `<HostLessonPin>` shows roamers where to rejoin. |
| Multi-instance Railway → SSE doesn't span instances | Each connection lives on a single instance and reads the same DB; no cross-instance coordination is needed. The host's write goes to whichever instance handles their request and is visible to all subscribers via the next poll. |
| Participant who roams and never returns to host position | Acceptable. Roster shows them at their actual lesson. The "lockstep" identity is *opt-in via the toggle*, not enforced. |
| Participant joined but closed the page (no SSE connection, no heartbeat) | Their `lastActivityAt` stops updating. After ~2 minutes they render as offline in the roster. Their `currentLessonId` shows wherever they last were. No automatic pruning — they remain in the roster until the session ends. Acceptable for v1; aligns with how Zoom shows people who lost connection. |
| Two pollers per connection (lesson + roster) at different cadences | Acceptable complexity. Splitting is intentional — the lesson change is the urgent signal; the roster can lag a few seconds without harming UX. |
| Host writes to `course-sessions.currentLesson` race with their own afterChange hook from Chunk 2 (`completedAt` stamping) | The hook only fires on `status` transitions, not `currentLesson` updates. No race. |
