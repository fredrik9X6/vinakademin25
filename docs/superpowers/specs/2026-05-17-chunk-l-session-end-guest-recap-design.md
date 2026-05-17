# Chunk L — Session-End Fixed + Guest Recap Access — Design

**Author:** Fredrik (with assistant)
**Date:** 2026-05-17
**Status:** Draft, awaiting final review

## Context & motivation

We shipped the recap (Chunk J), the blind guess card (Chunk I), and the leaderboard — but the actual "the host ended the session" moment is broken in two ways that real users noticed:

1. The persistent `ActiveSessionBanner` (the floating "Återgå till session" CTA in the top-right) stays visible after the host clicks "Avsluta session". Both host and guests keep seeing it, prompting them to rejoin a session that no longer exists.
2. Only the **host** lands on the recap. Guests get redirected to `/` (or stay where they are) — even logged-in guests who could perfectly well see the recap. Unauthenticated guests can't reach it at all, since `/mina-provningar/historik/[sessionId]` requires a Payload session.

Together these mean the recap — the whole reason we built Chunk J — is invisible to most of the room. The host has the cool screen; everyone else gets nothing.

This chunk fixes both, and opens the recap to unauthenticated guests via their existing `vk_participant_token` cookie. Guest viewers get a clear "Skapa konto för att spara" CTA so the next session converts them into a logged-in user.

## What ships in v1

- **SSE status broadcast.** The session stream now broadcasts `session.status` so clients can detect completion in real time.
- **Client-side end navigation.** When `status` flips to `completed`, all connected clients (host + guests) navigate to `/mina-provningar/historik/[sessionId]`.
- **ActiveSessionBanner dismissal.** The banner hides when the tracked session's status isn't `active`.
- **Guest auth on the recap.** `/mina-provningar/historik/[sessionId]` accepts a guest with a valid `vk_participant_token` cookie pointing to a participant in this session, in addition to today's logged-in-member path.
- **Guest CTA on the recap.** A "Spara din provning" banner appears for unauthenticated viewers, deep-linking to `/registrera` with the participant token so the claim flow associates the new user with their existing participant row + reviews + guesses on signup.
- **Wrap-up email audit.** Quick read-through of the existing wrap-up email template (Chunk D). If the content is wildly out of sync with the new recap, I'll align it; if it's already close, no change.

No new collections. No new migrations. One existing collection field gets a new use (`session.status` was already there, just not in the SSE payload).

## Architecture

### 1. SSE status broadcast

`src/app/api/sessions/[sessionId]/stream/route.ts` — extend `readHostPointer` (the polled snapshot the stream emits as `lesson` events):

```ts
return {
  currentLessonId,
  currentWinePourOrder,
  currentWineFocusStartedAt,
  revealedPourOrders,
  blindTasting,
  status,   // <-- new
}
```

`status` is `'active' | 'completed' | 'archived'`. Today the stream already polls the session every 2s and diffs the snapshot before emitting — adding one field is free.

`src/context/SessionContext.tsx` — track `status` on the activeSession state from the lesson event. When the value transitions from `active` to anything else, push the client to the recap:

```ts
useEffect(() => {
  if (activeSession?.status === 'completed') {
    router.push(`/mina-provningar/historik/${activeSession.id}`)
  }
}, [activeSession?.status, activeSession?.id, router])
```

This fires once per client. Host already navigates explicitly in `handleHostEnd` — they'd hit this redirect a beat later, idempotent. Guests get pushed automatically.

### 2. ActiveSessionBanner dismissal

`src/components/course/ActiveSessionBanner.tsx` — the banner reads `activeSession` from `useActiveSession`. Today it renders whenever `activeSession` exists (modulo `isHidden` / `isOnSessionPage`).

Two parts:
- The SessionContext should clear its `activeSession` when status flips out of `active` (after the redirect fires, before the next page renders).
- Defensive: the banner also early-returns when `activeSession.status && activeSession.status !== 'active'`.

Belt-and-suspenders so a stale context value can't keep showing the CTA.

### 3. Guest auth on the recap page

`src/app/(frontend)/(site)/mina-provningar/historik/[sessionId]/page.tsx` — current shape:

```ts
const user = await getUser()
if (!user) {
  redirect(`/logga-in?from=...`)
}
```

New shape:

```ts
const user = await getUser()
let participantId: number | null = null

if (user) {
  // existing path — host or member participant
} else {
  // guest path — try participantToken cookie
  const token = cookieStore.get(PARTICIPANT_COOKIE)?.value
  if (!token) {
    redirect(`/logga-in?from=...`)
  }
  const partsRes = await payload.find({
    collection: 'session-participants',
    where: {
      and: [
        { session: { equals: sid } },
        { participantToken: { equals: token } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (partsRes.docs.length === 0) {
    redirect(`/logga-in?from=...`)
  }
  participantId = (partsRes.docs[0] as { id: number }).id
}

const recap = await getSessionRecap(
  payload,
  session,
  user?.id ?? 0,            // 0 means "no user identity"
  participantId,
)
```

`getSessionRecap` already takes `participantId` for the compare-me view; passing the guest's participant id makes the recap show their own reviews + guesses correctly. The `viewerUserId: 0` for guests is benign — it doesn't match any real user, so `reviewBelongsToViewer` only matches via `participantId` for guests, which is the right semantics.

### 4. Guest "Skapa konto" CTA

`src/components/session-history/SessionHistoryDetail.tsx` — accept a new prop `viewerIsGuest: boolean` (page computes it: `!user && participantId != null`).

Render a top-of-page banner card when `viewerIsGuest`:

```
┌───────────────────────────────────────────────────────────┐
│ 🍷 Spara din provning                                     │
│ Skapa ett konto för att spara dina anteckningar, betyg   │
│ och gissningar. Du behåller allt från den här provningen.│
│                                                           │
│ [Skapa konto]  [Logga in]                                 │
└───────────────────────────────────────────────────────────┘
```

The "Skapa konto" button links to:
```
/registrera?claim=<participantToken>&from=/mina-provningar/historik/<sessionId>
```

The existing `/registrera` flow already runs through `RegistrationForm`. After successful signup, the post-signup hook calls `POST /api/sessions/claim` which already exists and associates participants with the newly-created user.

**One thing to verify during the build:** that the registration flow currently consumes a `claim` query param and forwards the token to `/api/sessions/claim`. If not, we wire it up — this is a small addition to the form's `onSubmit` flow.

### 5. Wrap-up email audit

`src/lib/session-emails/wrap-up.ts` (Chunk D, shipped 2026-05-13) builds the post-session email. The cron at `src/app/api/cron/send-wrap-up-emails/route.ts` fires it 18h after a session completes. It already covers guests with `email` set on their participant row.

What I'll check during the build:
- Does the email include the new headline stats (top wine, most divisive, top group flavours)?
- Does it include a "Visa hela sammanfattningen" deep link to `/mina-provningar/historik/[sessionId]?token=<participantToken>`?
- If a guest hasn't claimed yet, does it include a "Skapa konto" CTA matching the recap-page banner?

If the email is already aligned (the chunk-d spec referenced top-rated wine and most-divisive — quite possibly there), no change. If it's thin, I'll align — but cap the scope at "include the headline stats and a deep link to the recap." Anything bigger goes to a follow-up chunk.

### Reused utilities / patterns

- `useActiveSession` from `src/context/SessionContext.tsx` (already polled by SSE).
- `PARTICIPANT_COOKIE` constant from `src/lib/sessions.ts`.
- `getSessionRecap` from `src/lib/session-recap.ts` (already accepts participantId).
- `RegistrationForm` from `src/components/auth/RegistrationForm.tsx` (existing).
- `POST /api/sessions/claim` (existing).

## What we explicitly do NOT do in v1

- **No SSE-driven recap data refresh.** When the host ends the session, guests redirect to the recap and the page fetches fresh. We don't try to push recap data over SSE — too much extra surface for a one-shot screen.
- **No automatic email-on-end.** The wrap-up cron stays at 18h. We don't move to "instant on host-end" because the existing pacing gives time for late stragglers to submit their last review.
- **No "session ended" toast on guest devices.** The forced redirect IS the notification. A toast on top of a redirect is double-spending.
- **No mid-session reconciliation for the banner.** If a user has the app open in two tabs and one shows the recap while the other still shows the banner, that's a 2-second race window we don't bother fixing.
- **No restore-to-recap-from-anywhere.** If a guest closes the browser before claiming, they re-find the recap via the wrap-up email. We don't show "your recent sessions" on `/` or anywhere else for unauthed visitors.
- **No "Lämna" mid-session change.** The guest's "Lämna session" button still goes to `/` — the user only complained about the **host-end** flow, which is what we're fixing. Mid-leave is a legitimate "I'm bailing" signal.

## Verification

End-to-end smoke list:

1. **SSE status broadcast.** Open the live session as host. Open DevTools → Network → the SSE connection. Trigger "Avsluta session". Confirm the next `event: lesson` payload includes `status: "completed"`.
2. **Host-side redirect.** As host, "Avsluta session". Confirm you land on `/mina-provningar/historik/<sessionId>`. (No regression from Chunk J.)
3. **Guest-side forced redirect (member).** With a logged-in guest in the session on another device, have the host end. Confirm the guest is auto-navigated to the same `/historik/<sessionId>` page without manual action.
4. **Guest-side forced redirect (anon).** Same as #3 but with an unauthenticated guest who joined via the join code (has `vk_participant_token` cookie). Confirm the redirect fires and the recap loads.
5. **Banner dismissed.** During #2-#4, confirm the top-right "Återgå till session" banner does NOT reappear on subsequent page navigation.
6. **Guest recap content.** As the unauthenticated guest from #4, scroll the recap. Confirm:
   - Headline stats render (Veckans favorit, Mest delande, Smaker rummet pratade om).
   - Per-wine cards show "Du" with the guest's own ratings + flavours.
   - Blind leaderboard renders (if blind session) with the guest's row in it.
7. **Guest CTA visible.** At the top of the recap (only when viewer is guest), confirm the "Spara din provning" banner is present with [Skapa konto] [Logga in] buttons.
8. **Skapa konto deep link.** Click [Skapa konto] — confirm `/registrera` opens with `?claim=<token>&from=<historik-path>` in the URL.
9. **Post-signup claim.** Complete the registration. Confirm:
   - The new user is created.
   - The participant row's `user` field is now set to the new user.
   - All reviews and guesses tagged to that participant are now claimable / show up under the user's profile.
   - The user is redirected back to the recap (now as an authed member, no guest banner).
10. **Wrap-up email still works.** Force the cron via `pnpm send-wrap-up-emails` against a recently-completed session. Confirm the participant with `email` set receives the email; confirm the deep link in the email lands on the recap (whether claimed or guest-token).
11. **Unrelated route safety.** `/admin`, `/vinkompassen`, `/vinlistan/X` — confirm nothing about the auth changes leaks. Only `/mina-provningar/historik/[sessionId]` gets the new guest path.

## Risk / fallback

- **SSE clients in the background.** Browsers throttle background tabs; the SSE poll runs at 2s but the EventSource may suspend. Worst case: a guest doesn't see the redirect until they bring the tab to front. Acceptable — they're not paying attention to a backgrounded tab anyway.
- **Stale `vk_participant_token` cookies.** Cookie has a 24h max-age. A guest visiting `/historik/<id>` 25h after the session ends gets bounced to `/logga-in`. The wrap-up email (sent at 18h) is the redundant path. Acceptable trade-off; tightening this means longer-lived guest cookies which is its own security thing.
- **Multiple sessions on the same browser.** A guest who attended two different sessions in the same browser only has ONE participant cookie (the most recent join overwrites). So they can only see the recap for the latest session via the cookie path. The email deep link uses a `participantToken` query param to handle older sessions — wrap-up email already builds links that way for chunk D.
- **Claim flow edge case.** If a guest signs up with an email already attached to an existing account, the registration fails with a duplicate-email error and the claim doesn't happen. Existing behaviour. They can log in instead via the [Logga in] button which would call the claim manually post-login (verify during build).
- **Banner flash on slow networks.** The user might briefly see "Återgå till session" before the SSE status event lands. We accept this — it's a sub-second flash and the redirect resolves it.
