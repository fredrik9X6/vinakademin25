# Session Polish Bundle — QR + status-aware /delta

## Context

The group-session feature already supports authenticated and guest joins via a 6-character `joinCode`, with a dedicated `/delta?code=ABC123` landing page that prefills `JoinSessionDialog`. Two friction points remain:

1. **Sharing the code is manual.** The host has to copy the code or the link and paste it into a chat. In-person, guests have to type a 6-char code on their phone. No QR code today.
2. **Failure states are red alerts.** When a guest opens `/delta` for a session that's paused, completed, expired, full, or unknown, the page renders the join form anyway. Errors only surface *after* the user has typed a nickname and submitted, as a destructive `Alert` component above the form. This is wrong — the code is in the URL; we already know the session can't be joined.

This bundle fixes both with the smallest possible change: one new read-only API + a `/delta` rewrite that branches on status, and a QR section in the host's existing share modal.

## Goal

1. Cut share friction by letting hosts present a QR for guests to scan from their phone.
2. Replace the post-submit red-alert failure UX with state-specific landing pages that explain what's wrong and what the guest can do next.
3. Auto-recover paused sessions: a guest who lands during a pause sees the join form the moment the host resumes.

Out of scope: any new realtime infra (waits for Chunk 3), any new collection or schema change, fullscreen presentation mode, account-claim CTAs on ended sessions, "notify me when this host runs another" capture.

## Design

### 1. New API: `GET /api/sessions/lookup`

Read-only, public. Mirrors the entry-condition checks from `/api/sessions/join` without side effects, returning the minimum the landing page needs to render.

**Request**

```
GET /api/sessions/lookup?code=ABC123
```

**Response (200 always; status field carries the meaning)**

```ts
{
  status: 'active' | 'paused' | 'completed' | 'expired' | 'full' | 'not_found',
  course?: { title: string; slug: string },        // omitted on not_found
  sessionName?: string | null,                      // omitted on not_found
  participantCount?: number,                        // for 'full' state copy
  maxParticipants?: number | null,
}
```

**Status derivation** (matches `/api/sessions/join`):

| Status | Condition |
|---|---|
| `not_found` | No session with this `joinCode` |
| `expired` | `expiresAt` is set and `< now()` |
| `completed` | `status === 'completed'` |
| `paused` | `status === 'paused'` |
| `full` | `maxParticipants !== null && participantCount >= maxParticipants` |
| `active` | none of the above |

The endpoint never returns 4xx — every legitimate input lands in one of the six status values. Malformed input (missing `code`, non-string, length ≠ 6, non-alphanumeric) is normalized to `not_found` rather than 400 — the page treats those identically. Internal errors (Payload exception) are the only 5xx case.

`code` is trimmed, uppercased, and matched against `joinCode` exactly as `/api/sessions/join` already does. `course.title` and `course.slug` come back populated for everything except `not_found`, so the landing page can show "*Tasting:* X" copy in every error state.

`/api/sessions/join` is unchanged and remains the source of truth for join eligibility — `lookup` is a read-only twin so the page can decide what UI to show *before* asking for nickname/email.

### 2. `/delta` page rewrite

`src/app/(frontend)/(site)/delta/page.tsx` becomes a server component that pre-flights when `?code=` is present, then renders one of six branches.

| URL | Server pre-flight? | UI |
|---|---|---|
| `/delta` (no code) | no | Existing `JoinSessionDialog` with empty code. Manual entry validates on submit (today's behavior). |
| `/delta?code=…` → `active` | yes | Existing `JoinSessionDialog` with the code prefilled. |
| `/delta?code=…` → `paused` | yes | "Värden har pausat sessionen" + quiet polling indicator. Auto-flips to the active UI when status changes. Polling lives in a small client component. |
| `/delta?code=…` → `completed` | yes | "Sessionen är slut" + "Bläddra fler vinprovningar" → `/vinprovningar`. |
| `/delta?code=…` → `expired` | yes | Same as completed; copy: "Sessionen har gått ut." |
| `/delta?code=…` → `full` | yes | "Sessionen är full — `<participantCount>`/`<maxParticipants>` deltagare" + browse CTA. |
| `/delta?code=…` → `not_found` | yes | "Vi hittar ingen session med den koden" + a single CTA button "Försök igen" that navigates to `/delta` (clears the bad code from the URL). |

Each non-active state shows the course title/sessionName when available, so the guest knows *which* session they tried to join.

#### Paused → active polling

A small client component (`<PausedWatcher code={code} />`) calls `GET /api/sessions/lookup?code=…` every 5 s. When the response status flips to `active` (or anything other than `paused`), the client triggers a `router.refresh()` so the server component re-renders with the new branch. The poll aborts on unmount and stops once the status changes (no need to keep polling after recovery).

Tradeoff: 12 requests/min per paused viewer is fine — pauses are rare and short. SSE / push waits for Chunk 3.

#### `not_found` behavior

Per agreed scope: the page shows the error message + a single "Försök igen" CTA linking to bare `/delta`. No retype input on this state. The user gets a clean restart on the bare landing page.

### 3. `StartSessionButton` — QR section

Add a QR display below the existing code + share-link rows in the share modal. Encodes the same URL the link button copies (`${origin}/delta?code=${joinCode}`).

```
┌─ Existing share modal ──────────────────────┐
│  Sessionskod: ABC123      [Kopiera]         │
│  Länk: …/delta?code=ABC123 [Kopiera]        │
│  ─────────── ELLER SKANNA ──────────────    │
│              ┌──────────────┐                │
│              │  ▓▓░▓░░▓▓ ░  │                │
│              │  ░▓▓░▓▓░▓ ▓  │ (192×192 px)   │
│              │  ▓░░▓░▓░░ ░  │                │
│              └──────────────┘                │
└─────────────────────────────────────────────┘
```

Library: `qrcode.react` (4 kB gzipped, actively maintained). 192×192 px display size — large enough to scan from across a tasting table, small enough not to dominate the modal.

No fullscreen / presentation mode in this chunk.

### 4. Copy

Swedish only (matches the rest of the surface). All strings live inline in the page component — no new i18n module needed for six strings.

| State | Heading | Body | CTA |
|---|---|---|---|
| `paused` | Värden har pausat sessionen | Du kan ansluta så snart värden återupptar. Vi kollar automatiskt. | (none — auto-flips) |
| `completed` | Sessionen är slut | Den här grupprovningen är avslutad. Vi har många fler. | "Bläddra vinprovningar →" |
| `expired` | Sessionen har gått ut | Tiden för att ansluta har löpt ut. | "Bläddra vinprovningar →" |
| `full` | Sessionen är full | `{N}` av `{Max}` deltagare har redan anslutit. | "Bläddra vinprovningar →" |
| `not_found` | Hittar ingen session med den koden | Dubbelkolla koden från värden. | "Försök igen →" (→ `/delta`) |

When `course.title` is available it appears as a subtitle under the heading: "*Vinprovning:* `{course.title}`".

## Files touched

```
NEW   src/app/api/sessions/lookup/route.ts
EDIT  src/app/(frontend)/(site)/delta/page.tsx          (rewrite as server component)
NEW   src/app/(frontend)/(site)/delta/PausedWatcher.tsx (small client poller)
EDIT  src/components/course/StartSessionButton.tsx      (add QR section)
ADD   pnpm i qrcode.react
```

No migration. No collection or `payload-types` changes.

## Testing

- Manual: hit `/delta?code=BADCODE` → `not_found` UI; hit `/delta?code=<paused>` → paused UI flips to active when host resumes; hit `/delta?code=<completed>` → completed UI; hit `/delta?code=<full>` → full UI with correct counts.
- QR: scan the rendered QR with a phone, confirm it lands on `/delta?code=<correct>` and prefills the code.
- Network: confirm `PausedWatcher` aborts in DevTools when navigating away mid-poll.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| `lookup` becomes a session-enumeration vector (someone iterating codes) | 6-character alphanumeric codes (≈2 billion) plus a small rate-limit on the endpoint by IP if abuse appears. Not addressing in this chunk; flagged for monitoring. |
| Polling load from many simultaneous paused viewers | 5 s interval × N viewers is bounded by how many people are mid-join during a single pause. Realistic worst-case is single-digit viewers per session. Non-issue at current scale. |
| `qrcode.react` SSR | Component is client-only; it'll render inside the existing client share modal. No SSR concern. |
