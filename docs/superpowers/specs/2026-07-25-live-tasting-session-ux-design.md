# Live tasting session UX — participant + host redesign

**Date:** 2026-07-25
**Status:** Design approved, pending implementation plan
**Surface:** `/mina-provningar/planer/[id]?session=<id>` (plan-driven live tastings, blind and non-blind)

---

## 1. Why

A participant in a live blind tasting cannot tell what to do, cannot tell what scores
points, and — until yesterday — could lose ten minutes of tasting notes without being
told. The trigger for this work was a report that "Betygsätt vin" reads as a heading for
the three dropdowns below it rather than as a button. Investigation confirmed that and
found the surrounding problems to be larger.

### 1.1 Verified defects

**The rating modal opens empty for every unrevealed wine in a blind session.**
`PlanSessionContent.tsx:638-645` renders `Betygsätt` with no `disabled` and no reveal
condition. The server strips `libraryWine: null, customWine: undefined` from unrevealed
wines for guests (`page.tsx:176-194`). The dialog body is a ternary
(`PlanSessionContent.tsx:762-791`) whose fallback is `: null`. The guest therefore sees
`Betygsätt: Vin #3` over a blank box — no empty state, no explanation, no disabled
tooltip. Even if the form mounted, `/api/reviews/route.ts:307-312` rejects a body
carrying neither `wine` nor a non-empty `customWine.name`.

**The visual hierarchy is inverted.** `Lås in` inside the guess card passes no `variant`,
so it resolves to the filled primary style (`BlindGuessCard.tsx:379-386`). `Betygsätt` is
`variant="outline"` — byte-identical to the host-only "Avslöja vin #N" (`:647-655`) and to
the inactive "Sätt fokus" (`:628-636`), all packed into one undifferentiated
`flex gap-2 flex-wrap items-center` row (`:625`). The optional guessing game has the
primary button; the core task has a chip.

**Nothing on the card is typographically a heading.** There is no `<h2>` or `<h3>`
anywhere in the 982-line `PlanSessionContent.tsx`. Wine titles are
`<p className="text-sm font-medium">` (`:590`); the guess block's heading is
`<p className="text-xs … uppercase tracking-wider">` (`BlindGuessCard.tsx:316`). Because
every real section label sits in the same size band as the button, a small bordered word
is indistinguishable from a heading. The loudest element on the card — the pour-order
numeral at `text-[110px] sm:text-[130px]` (`:571-576`) — is `aria-hidden` and
`pointer-events-none`.

**Scoring is never communicated.** The word "poäng" appears nowhere in the live session
UI. The only statement of the rule in the product — `1 poäng per rätt: land, druva,
prisintervall.` — is `BlindLeaderboard.tsx:64`, rendered only on the post-session history
page. The live sidebar *is* the leaderboard (the server sorts by points desc,
`stream/route.ts:274-277`) but is titled "Deltagare (N)" (`SessionRoster.tsx:166-169`) and
**hides the points number entirely when points === 0** (`:117`), so a player on zero sees
nothing at all.

**Two lock-ins on two surfaces across two endpoints.** A blind guest performs `Lås in`
(inline, `/api/session-guesses`) and `Klar / Lås in` (in a modal, `/api/reviews`) per
wine, plus two pure-navigation clicks, plus N debounced autosaves.

**No completion state.** `submittedPourOrders` is tracked and read at exactly one place
(`:561`, to gate the swarm panel). The `Betygsätt` label, variant and icon are identical
before and after rating, so on a six-wine list a participant cannot tell which wines they
have already done without opening each modal.

**Reveal is irreversible.** `host-state/route.ts:72-78` only set-unions
`revealedPourOrders`; no un-reveal endpoint exists. A misclick ends the suspense
permanently.

### 1.2 Production evidence (PostHog, trailing 12 months)

| Signal | Measurement |
|---|---|
| Device split, live-session save attempts | **82% mobile** (89 of 108). Desktop pageviews are inflated by hosts and plan editing. |
| Rage-clicks inside live sessions | **9 distinct people** — roughly half of everyone who has used the surface |
| Worst single control | the cmdk **MultiSelect flavour picker**: 7 rage-clicks from 2 people, mobile only |
| Rage-clicked *and* discarded | **"Jag hade köpt detta vin igen"** — 4 events / 2 people. `buyAgain` has no field on `Reviews.ts` and no DB column; it is posted and dropped. |

**Save reliability, by draft kind:**

| kind | attempts | successes | failures |
|---|---|---|---|
| `review` | 95 | 40 | **55 (58%)** |
| `guess` | 14 | 14 | 0 |

Worst case: `sessionId=21, pourOrder=1` — **49 attempts, 0 successes, 584 seconds**, on
2026-07-24.

**Root cause, and its current status.** Pre-fix `buildReviewBody` sent
`rating: (draft.rating as number) || 0`, i.e. literal `0` on every autosave before the
participant tapped a star. `Reviews.rating` was `required: true, min: 0.5` with a custom
validate. Payload threw a `ValidationError` out of `payload.create`/`update`, the route's
single catch (`route.ts:462-471`) turned it into an opaque 500, and
`use-session-draft.ts:177` re-queued the byte-identical body forever. Guesses were immune
because `/api/session-guesses` has no required numeric field.

This was **fixed in `230dd4c` (2026-07-24 19:29)** — rating now sends `null`, and
migration `20260724_171748_reviews_rating_optional` dropped the NOT NULL. It reached
production as `9cfe4e2`.

**What remains, and is in scope here:** the route still maps *every* write rejection to a
bare 500, and the autosave queue still re-sends an identical failing body with a 15 s
backoff cap and **no attempt ceiling** (`session-draft-queue.ts:64-69`). The next
data-dependent rejection reproduces the same silent ten-minute loop. Separately, the
`200 + empty docs` admin-probe escape hatch (`route.ts:307-330`) makes an identity-less
review write look like a *success* to the client — silent data loss with no failure event
at all.

---

## 2. Scope

**In scope:** the entire live session experience for both roles — the participant's
per-wine surface, the session shell, the reveal moment, the host's pacing and reveal
controls, the scoring vocabulary, and the reliability of the writes that back all of it.

**Out of scope:** the plan editor (`PlanDetailView`, `TastingPlanForm`), the template
authoring flow, the post-session recap and history pages, `blindkamp`, and the video-course
product (`vinkurser`). Changes leak into these only where a shared component is extracted.

---

## 3. Principles

1. **One wine, one surface, one commitment.** Everything a participant does for a wine
   lives in one place and is committed once.
2. **The host drives the room.** The screen follows the host's focus by default, because
   everyone is physically tasting the same wine at the same time.
3. **Never hijack.** Following the host must never move the screen out from under someone
   who is typing.
4. **Say what scores.** If an input earns points, the UI says so, in kronor-plain Swedish,
   at the moment of answering.
5. **A failed write is visible.** No silent success, no infinite retry, no lost note.

---

## 4. The phase model

The participant's work is not three parallel tasks. It is **three phases the host
drives**:

| Phase | Participant does | Scored | Deadline |
|---|---|---|---|
| **Före avslöjande** | Guess land / druva / pris | ✅ 1 p each, 3 max | **Freezes at reveal** |
| **Före avslöjande** | Write tasting note | ❌ | none |
| **Efter avslöjande** | Sees wine, own score, room's verdict | — | — |

The current UI models phases 1 and 3 as parallel and breaks the rating half of phase 1.
Every decision below follows from correcting that.

---

## 5. Participant surface

### 5.1 Shell — focus-follows-host

The flat always-expanded `<ul>` of every wine (`PlanSessionContent.tsx:538`) is replaced
by a **single-wine focus view**.

- Default render is the host's current wine (`activePour`), full width.
- When the host changes focus, the view transitions **only if the participant has not
  touched an input in the last 10 seconds**. Otherwise a dismissible bar appears:
  `→ Värden är nu på vin #3` — tapping it moves, ignoring it does nothing.
- A header control `Alla viner ≡` opens the overview list.
- Header shows `Vin 2 av 5` with a five-dot progress indicator whose dots carry per-wine
  state (done / current / untouched).

**Overview list** (`Alla viner`) replaces the old main column. One row per wine:

```
①  Vin #1      ✓ Klar        3 p
②  Vin #2      ● Pågår      0/3
③  Vin #3        Ej börjad
```

This is the completion state the product has never had. Rows are tappable and jump the
focus view to that wine — a participant may work ahead or go back at will; only the
*default* follows the host.

### 5.2 The wine surface

Top to bottom, inside one scroll container with a sticky footer:

**Wine header.** Pour number, `Vin #2` (or the real name once revealed), state badge
(`Värden pratar om detta`), and the focus timer when the plan sets
`defaultMinutesPerWine`. Post-reveal this region grows to hold the bottle image and
producer/vintage.

**Blindgissning section** — blind sessions only, rendered *only while unrevealed*:

```
BLINDGISSNING                                    [3 poäng]
Låses när värden avslöjar vinet

  Land     [ Frankrike            ▾ ]               1 p
  Druva    [ Syrah                ▾ ]               1 p
  Pris     [ 150–249 kr           ▾ ]               1 p
```

- A real `<h2>`, not a muted `<p>`. Brand-tinted panel so it is unmistakably a distinct
  block from the notes below it.
- The `3 poäng` badge uses the existing `Badge variant="brand"`.
- Per-row `1 p` chips are the first point communication that has ever existed in the live
  UI.
- Tier visibility still keys off the server-baked `blindTiers` booleans; the badge total
  is computed from the *shown* tiers, so a two-tier wine reads `2 poäng`, not `3`.
- The `Lättare läge` badge is retained, keyed as today off `easyModeOptions.countries`.

**Smaknotering section** — always present, in every session type, revealed or not:

```
SMAKNOTERING                          Ger inga poäng
  ( Enkel )   Avancerad
  ★ ★ ★ ★ ☆
  Smaker    [ + Lägg till ]
  Noteringar [                              ]
```

`Enkel` / `Avancerad` remains exactly what it is today — a **depth** control for the
notes, persisted per device in `localStorage['vk_review_mode']`. It moves from a modal
into this section. It does **not** gain a third "Blindgissning" tab.

> **Rejected alternative — a `Blindgissning` tab.** Considered and declined. Tabs express
> alternative views of the same thing; `Enkel`/`Avancerad` is a depth control while
> Blindgissning is a different question type carrying a hard deadline. Putting them on one
> tab strip would hide the time-critical input behind a tab (a participant could miss the
> reveal entirely), conflate "how deep are my notes" with "am I playing the game", and
> leave the point-scoring inputs invisible by default — the opposite of the goal. A
> permanent, visually distinct top section achieves the same clarity without hiding
> anything.

**Sticky footer.** Save status on the left, one primary button on the right:

```
Sparat ✓                          [  Klar med vin #2  ]
```

### 5.3 Commitment — one button, both halves

`Klar med vin #2` commits the guess **and** the tasting note together.

- Both halves continue to autosave independently as they do today (`/api/session-guesses`,
  `/api/reviews`) — that machinery is proven and stays.
- The button performs the **explicit commit**: stamps `submittedAt` on the guess and locks
  the review, via a single new endpoint (§7.2).
- After commit the section collapses to a summary with `Ändra`. While still unrevealed,
  `Ändra` reopens **both** halves; after reveal it reopens the note only, because the
  guess has frozen.
- The guess freezes at reveal regardless of whether the participant ever pressed the
  button. Scoring already ignores `submittedAt` (`SessionGuesses.ts` field comment:
  "NULL = draft / autosaved… MUST NOT gate recap inclusion"), and that stays true.
- The button is **never disabled for being empty**. A participant who tasted but wrote
  nothing may still mark the wine done.

### 5.4 Reveal — the full moment

Reveal is the payoff the entire blind format is built around; today it is a 2-second poll
followed by an unannounced `router.refresh()`. Redesigned:

1. The nudge bar announces it: `Värden avslöjar vin #2…`
2. The bottle image and real name transition in where the anonymous placeholder was.
3. Each guess row flips to ✓ or ✗ with the correct answer inline (the existing `Row` /
   `PriceRow` rendering, kept).
4. Points tally up to the earned total. **`+0 poäng` renders too** — today
   `BlindGuessCard.tsx:242` suppresses the line when `points > 0` is false, so a 0/3 wine
   shows three red crosses and no score at all.
5. The room's average rating (`SwarmPanel`) appears beneath.

Motion uses framer-motion, already a dependency. The transition must be interruptible and
must respect `prefers-reduced-motion`.

**Reveal latency.** The SSE stream is a 2 s DB poll (`stream/route.ts:14`), and guests
additionally force a full server-component refetch (`PlanSessionContent.tsx:424-434`).
During that window `isHiddenForGuest` has already flipped false while the row still holds
load-time redacted nulls, so the wine renders as "Namnlöst vin" with a placeholder bottle.
The new surface must render an explicit `Avslöjas…` skeleton for that window rather than
a broken intermediate state.

---

## 6. Host surface

The host's row of three visually identical outline chips (`Sätt fokus`, `Betygsätt`,
`Avslöja vin #N`) is replaced by a clear two-tier structure.

**Reveal is the host's primary action.** It becomes the single `.btn-brand` on the host's
screen for the current wine. Per the styleguide's "exactly one primary CTA per screen"
rule (`styleguide/page.tsx:997`), nothing else on the host view may use `.btn-brand`.

**Reveal gains an undo window.** `host-state/route.ts` accepts a new `unrevealPourOrder`
action, valid for 30 seconds after the reveal. A misclick is currently permanent, and the
set-union write makes it unrecoverable without direct DB access. The undo surfaces as a
toast action: `Vin #2 avslöjat` · `Ångra`.

**The reveal guard stays but improves.** `attemptReveal` already blocks on participants
with no content (`PlanSessionContent.tsx:480-487`); it must now count reliably — see
§7.4, which fixes the participant-identity bug that makes the count wrong for logged-in
users.

**`Vem har svarat` is promoted** from a small muted `<p>` (`:960`) to a real section with
per-participant state, since it is the host's only instrument for pacing the room.

**Host script stays where it is.** `Manus & fakta` continues to open a right-side `Sheet`
(`:735-755`); it is reference material, correctly separate from the action flow.

---

## 7. Data flow and API changes

### 7.1 Rating an unrevealed wine — resolve identity server-side

The blocker is that the client is deliberately denied the wine's identity, and the write
path demands it. The server knows the wine even when the guest does not.

`/api/reviews` gains a **session-scoped write path**: when a body carries
`session` + `pourOrder` and no wine identity, the route resolves the wine from the
session's plan **server-side** and attaches `wine` or `customWine` itself.

- The client never receives the identity — blindness is preserved.
- The review row is correctly attributed from the first keystroke, so nothing needs
  back-filling at reveal.
- The redaction in `page.tsx:176-194` is unchanged.
- This deletes the `libraryWineId ?? customWineSnapshot ?? null` ternary
  (`PlanSessionContent.tsx:762-791`) that causes the empty modal, rather than patching
  around it.

### 7.2 One commit endpoint

New: `POST /api/sessions/[id]/wines/[pourOrder]/commit`, body `{ guess?, review? }`.

Writes both halves server-side and returns per-part status. Rationale: "one thing to save"
must be true at the transport layer too, or a partial failure leaves the participant
believing both saved. The existing per-kind endpoints stay for the continuous autosave.

The client reports success only when the server confirms **both** parts, matching the
existing discipline in `WineReviewForm.tsx:673-707`, which already refuses to report
success on an unconfirmed lock-in.

### 7.3 Write reliability

- **Map validation to 4xx.** `/api/reviews` must distinguish a Payload `ValidationError`
  from an infrastructure failure and return 4xx with a message. Per project convention,
  detect it with `instanceof ValidationError` — `err.name === 'ValidationError'` is
  unreliable because minification rewrites the name, which is what produced the opaque 500
  in the first place.
- **Cap autosave retries.** `session-draft-queue.ts` gains an attempt ceiling for the
  debounced path, matching `MAX_LOCKIN_ATTEMPTS = 5` on the lock-in path. A 4xx must not
  be retried at all — the body will never become valid on its own.
- **Surface permanent failure.** On give-up, show a real error, keep the localStorage
  draft, and offer a retry. Never fail silently.
- **Remove the escape hatch for session writes.** The `200 + empty docs` admin-probe
  branch (`route.ts:307-330`) must not apply when the body carries a `session`. It
  currently converts data loss into a reported success.

### 7.4 Participant identity

`buildReviewBody` omits `sessionParticipant`, and the route derives it from the cookie
only when there is no authenticated user (`reviews/route.ts:211-235`, `:416-422`).
`/my-submissions` then filters strictly on `sessionParticipant`
(`route.ts:82-88`). Consequence: **a logged-in participant's session reviews are invisible
to draft rehydration, to the completion state, to the host's "Vem har svarat" tracker, and
to the reveal guard's missing-count.** The route must resolve and persist
`sessionParticipant` for authenticated participants too — it already can, via the
`session-participants` row (`:50-68`).

---

## 8. Copy

All new strings, Swedish, matching the existing register.

| Context | String |
|---|---|
| Guess section heading | `BLINDGISSNING` |
| Guess points badge | `3 poäng` (or `2 poäng` / `1 poäng` per shown tiers) |
| Guess deadline | `Låses när värden avslöjar vinet` |
| Per-field point chip | `1 p` |
| Notes section heading | `SMAKNOTERING` |
| Notes scoring note | `Ger inga poäng` |
| Commit button | `Klar med vin #2` |
| Committed summary | `Klar` + `Ändra` |
| Focus nudge | `→ Värden är nu på vin #3` |
| Reveal announcement | `Värden avslöjar vin #2…` |
| Host reveal toast | `Vin #2 avslöjat` · `Ångra` |
| Sidebar heading | `Ställning` (was `Deltagare (N)`) |
| Zero score | `0 p` — always rendered, never hidden |
| Zero-point reveal | `+0 poäng` — always rendered |

**Copy corrections required.** `TastingPlanForm.tsx:875`, `TastingPlans.ts:72` and
`CourseSessions.ts:109` all claim "4 alternativ per fråga" / "correct + 3 decoys". The
code uses `GUESS_OPTION_COUNT = 5` (`page.tsx:14`) — correct plus **four** decoys. The
copy is wrong; fix the copy, not the constant. `CourseSessions.ts` and `TastingPlans.ts`
are collection descriptions, so this touches `payload-types.ts` and needs a migration.

---

## 9. Mobile

82% of real input is mobile, and the redesign targets a phone held in one hand at a dinner
table with a glass in the other.

- **Touch targets ≥ 44 px.** Current defaults are all below: `Button` `sm` is `h-8`,
  `default` `h-9`; `Select` trigger and `Input` are `h-9`. The session surface needs its
  own sizing, not the global defaults.
- **Replace the flavour MultiSelect.** The cmdk Popover + typed search input
  (`multi-select.tsx:213`, `:291-293`) is the single most rage-clicked control in the
  product. Replace with tap-chips built on `ToggleGroup` — already present, currently used
  in only two places.
- **Sticky footer clearances.** Must clear `MobileBottomNav` (`fixed bottom-0`, h-16,
  `pb-[env(safe-area-inset-bottom)]`), the layout's `pb-20 md:pb-0` on `<main>`, and the
  sonner offset of `calc(72px + env(safe-area-inset-bottom))`. `FeedbackButton` hard-codes
  a route allowlist of bottom offsets (`FeedbackButton.tsx:36-50`) and needs the session
  route added.
- **Fix the dead breakpoint.** `tailwind.config.js` has **no `screens` key**, so `xs` does
  not exist, yet `hidden xs:inline` is used on both existing mobile bottom bars
  (`LessonViewer.tsx:566`, `:576`; `CourseQuizViewer.tsx:329`, `:339`) — `hidden` wins
  permanently and those buttons render as bare chevrons. Either define `xs` or drop the
  class. Do not copy the pattern into the new footer.

---

## 10. Component architecture

`PlanSessionContent.tsx` is 982 lines and holds the shell, both roles, the wine rows, the
review dialog, the info sheet, three alert dialogs and the reveal logic. It is split:

| Component | Responsibility |
|---|---|
| `SessionShell` | header, roster sidebar, leave/end dialogs, SSE wiring |
| `SessionFocusView` | the current-wine surface; owns follow-vs-nudge |
| `SessionWineList` | the `Alla viner` overview with per-wine completion state |
| `WineGuessPanel` | blind guess inputs, point badges, deadline copy |
| `WineRevealPanel` | post-reveal identity, scored rows, points, swarm |
| `TastingNoteFields` | extracted from `WineReviewForm` — Enkel/Avancerad, renders inline |
| `WineCommitBar` | sticky footer: save status + single commit button |
| `HostWineControls` | focus, reveal, undo, "Vem har svarat" |
| `SessionFocusNudge` | the non-hijacking follow bar |

Each is independently testable and holds one job. `WineReviewForm` keeps its standalone
and lesson modes; only the session mode moves to `TastingNoteFields`.

**Primitives.** Everything needed exists: `ToggleGroup`, `Badge variant="brand"`,
`Progress` (accepts `indicatorClassName`), `StarRating`, `Sheet side="bottom"`,
framer-motion. `vaul` `Drawer` is installed with zero importers and is available if the
overview list wants one. **No `Stepper` exists** — the `Vin 2 av 5` indicator is new.

**Accessibility.** `StarRating` renders two focusable `role="radio"` buttons per star
(`star-rating.tsx:127-151`) — ten tab stops, no arrow-key handling, no roving tabindex.
It is the primary rating control and needs a keyboard pass.

---

## 11. Data model changes

Per `CLAUDE.md`, every collection or enum change ships with a migration generated by
`pnpm migrate:create` and committed alongside.

1. **`buyAgain` on `Reviews`.** The checkbox is rendered, posted, echoed by
   `/my-submissions` as `r.buyAgain ?? false`, rage-clicked by real users — and dropped,
   because no field and no column exist. Either add the field (+ migration) or delete the
   checkbox. **Decision: add it.** It is real signal for the recap and the user clearly
   expects it to persist.
2. **`publishedToProfile` for guests.** For guest participants `/api/reviews` writes
   `user: null` (`route.ts:407`), so "Publicera på min profil" has no profile to publish
   to. Hide the checkbox when there is no authenticated user.
3. **Reveal undo.** `revealedPourOrders` needs either a per-pour `revealedAt` or a
   separate audit field to bound the undo window.
4. **Copy fields.** The "4 alternativ" corrections in `TastingPlans` and `CourseSessions`
   descriptions regenerate `payload-types.ts` and need a migration.

---

## 12. Known adjacent defects — flagged, not all in scope

Found during investigation. Listed so they are not lost.

- **Live and final scores can legitimately disagree.** `session-live-scores.ts:54` skips
  unrevealed pours; the recap loop (`session-recap.ts:390-452`) has no equivalent check. A
  session ended with wine #5 unrevealed produces a recap total *above* the last live number
  the participant saw. **In scope** — the scoring vocabulary is part of this work.
- **`SwarmPanel` conflates "no data yet" with "no ratings"** (`SwarmPanel.tsx:31-36`), so
  "Inga betyg ännu — du var först." shows while SSE is merely still loading. **In scope.**
- **Dead plural ternaries** at `BlindGuessCard.tsx:244` and `SwarmPanel.tsx:47` — both
  branches identical. Trivial, fix in passing.
- **Easy mode only limits the country dropdown.** Grape options are decoy-limited for
  *every* blind session regardless of the flag; price always renders all six buckets
  (`page.tsx:134-156`). The `Lättare läge` badge therefore over-promises. **Out of scope**
  — flag to the product owner as a separate decision.
- **Easy mode cannot be changed mid-session.** `host-state/route.ts:48-63` accepts only
  three actions. **Out of scope.**
- **Template clone loses blind flags.** `tasting-plans/from-template/[templateId]` copies
  wines and answers but never sets `blindTastingByDefault` or
  `blindGuessEasyModeByDefault`, so every plan cloned from a curated template starts with
  blind **off**. `duplicate` does carry them. **Out of scope, but a real bug** — a host
  using a curated template gets a non-blind tasting unless they notice.
- **`revealStrategy` on `BlindBattles`** (`:123-132`) is required, defaulted, and read by
  nothing. Dead config. **Out of scope.**

---

## 13. Testing

The repo has no test suite, so verification is manual and instrumented.

**Manual matrix** — for each of {blind, non-blind} × {host, guest} × {logged-in, guest
token}:

1. Rate an **unrevealed** wine end to end; confirm the note persists and attaches to the
   correct wine after reveal.
2. Commit a wine with a guess but no note, and with a note but no guess.
3. Reload mid-note; confirm the draft rehydrates (this is the path currently broken for
   logged-in participants, §7.4).
4. Reveal while a participant is typing; confirm the nudge appears and the screen does not
   move.
5. Reveal, then undo within 30 s; confirm the wine re-hides for guests.
6. Score a 0/3 wine; confirm `+0 poäng` renders and the sidebar shows `0 p`.
7. Go offline mid-note; confirm the error surfaces, the draft survives, and retries stop.

**Instrumented verification.** The `vk_session_save_*` events already carry `kind`,
`sessionId` and `pourOrder`. After rollout, the acceptance check is a repeat of the query
that found this: `review` failure rate must be ~0%, and no `(sessionId, pourOrder)` pair
may show successive failures with zero successes.

**Existing scripts.** `scripts/verify-session-draft-queue.ts` and
`scripts/verify-blind-answers.ts` already exist and should be extended rather than
duplicated.

---

## 14. Sequencing

This design spans more than one safe deploy. It decomposes into four phases, each
independently shippable and each leaving the product better than it found it.

| Phase | Contents | Ships value alone? |
|---|---|---|
| **1 — Stop the bleeding** | §7.1 server-side identity resolution, §7.3 write reliability, §7.4 participant identity, `buyAgain` field + migration | Yes — the empty modal and the silent-loss paths are fixed without any visual change |
| **2 — Say what scores** | §8 copy, point badges, `Ställning` sidebar, `0 p` / `+0 poäng`, the "4 alternativ" corrections | Yes — pure clarity, low risk, no structural change |
| **3 — One wine, one surface** | §5.2 the combined surface, §5.3 single commit + §7.2 commit endpoint, `TastingNoteFields` extraction, §9 mobile sizing and the flavour chips | Yes — resolves the original complaint |
| **4 — The room** | §5.1 focus-follows-host and the overview list, §5.4 the reveal moment, §6 host controls and reveal undo, §10 the full component split | Yes — the polish layer |

Phase 1 must land first; §7.2's commit endpoint depends on §7.3's reliability work. Phases
2 and 3 can be reordered. Phase 4 is the largest and the most reversible.

## 15. Risks

- **The split of a 982-line file** touches the SSE wiring, the reveal hydration path and
  the redaction contract at once. `page.tsx:198-211` carries an explicit warning that the
  client reads the plan off `session.tastingPlan`, not the shell's `plan` prop; passing the
  unredacted session leaks wine names and blind answers to guests. Any refactor must
  preserve that substitution.
- **Focus-follows-host can feel like a hijack** if the 10-second idle threshold is wrong.
  It is the one number in this design most likely to need tuning against a real tasting.
- **The commit endpoint is a new single point of failure** for the explicit save. It must
  be built with the reliability work in §7.3, not before it.
- **Sample size is small.** Roughly 20 people have used the live surface. The rage-click
  and failure signals are strong and consistent, but the device split in particular should
  be re-checked after the next few real tastings.
