# Blindkamp + Vinklubb — Design Spec

**Status**: draft, awaiting user review
**Date**: 2026-05-19
**Scope**: new "blind battle" tasting format where each participant brings one wine to a themed group tasting; persistent wine clubs with cumulative leaderboards.

---

## Goal

Let groups of friends or wine clubs run a structured blind tasting where every participant submits one wine within a shared theme (e.g. "Rosés under 150 kr"). At the in-person session, wines are tasted blind, rated with stars, and revealed. The highest-rated wine wins — and the person who brought it gets credit on the club's running leaderboard.

The feature serves two related but distinct use cases:

1. **One-off pop-up**: a casual group runs a single blind battle. Guests allowed.
2. **Persistent wine club**: a recurring group runs many battles over time. Members have accounts; the club page maintains a cumulative leaderboard of who consistently brings the most-loved wines.

## Why now

The product currently supports solo tastings and host-curated group tastings (TastingPlans + CourseSessions). It does not support **competitive group tastings** where every participant is also a contributor. This is a distinct social mechanic and a missing piece of the "host your own wine event" story.

Wine clubs are also a reusable hub entity that lets future group-oriented features (shared wine lists, voting, monthly themes) attach without a refactor.

## Terminology

Swedish names are the user-facing ones; English names appear in code only.

| Concept | Swedish | English (code) |
|---|---|---|
| Persistent group | Vinklubb | WineClub |
| Single blind battle | Blindkamp | BlindBattle |
| Each participant's wine + presence | Bidrag | BlindBattleSubmission |
| The in-person rating event | Provning | CourseSession (reused) |
| Theme rules | Tema | theme + themeDescription |
| Leaderboard | Topplista | leaderboard |

---

## Decisions captured during brainstorming

| Decision | Choice | Notes |
|---|---|---|
| Submission timing | In advance, surprise reveal at session | Per-user submission link; no one sees others' picks |
| Club scope | First-class entity from v1 | Reusable for future features; v1 club = mostly leaderboard |
| Access | Members need accounts; pop-ups allow guests via shareable link | Guests prompted to claim accounts post-session |
| Wine source | Systembolaget preferred, free-text fallback | Mirrors existing customWine pattern |
| Theme | Structured filters (type + price range + optional country/grape) plus free-text description | |
| Rating depth | Stars required, full review optional | Stars drive leaderboard; full review hits existing Reviews + wrap-up email |
| Session ritual | Secret-shuffle default; neutral-helper fallback | App assigns each participant a private slot number; bottles wrapped in opaque sleeves |
| Premium gating | None in v1 — entirely free | Revisit after feature is validated |
| Reveal strategy | Host-chosen per battle: one-by-one OR all-at-end | Both supported, picked at battle creation |

---

## Data model

### New collections

#### `wine-clubs`

Reusable hub. Intentionally feature-light in v1 — designed so future activities can attach without a refactor.

| Field | Type | Notes |
|---|---|---|
| `name` | text | required |
| `slug` | text | unique, URL key |
| `description` | textarea | optional |
| `coverImage` | upload | optional |
| `inviteCode` | text | unique, used in shareable join URLs |
| `owner` | rel → users | required |
| `members[]` | array | per-member: `user` (req), `role` ('owner'\|'admin'\|'member'), `joinedAt` |
| `createdAt` / `updatedAt` | timestamps | |

**Access**: read = members; create = any authed user; update/delete = owner + admins.

#### `blind-battles`

A single themed competition.

| Field | Type | Notes |
|---|---|---|
| `title` | text | optional; auto-derived from theme if blank |
| `theme.wineType` | select | `red` \| `white` \| `rose` \| `sparkling` \| `orange` \| `dessert` \| `any` |
| `theme.priceMinSek` | number | optional |
| `theme.priceMaxSek` | number | optional |
| `theme.countries[]` | rel → countries | optional |
| `theme.grapes[]` | rel → grapes | optional |
| `themeDescription` | textarea | free-text nuance ("only natural wines", "no Bordeaux") |
| `host` | rel → users | required |
| `club` | rel → wine-clubs | nullable — pop-up battles have no club |
| `status` | select | `draft` \| `submissions_open` \| `in_session` \| `completed` \| `canceled` |
| `submissionDeadline` | date | optional |
| `sessionDate` | date | optional, planned date for the in-person event |
| `wineCount` | number | planned submission count (default = club member count) |
| `revealStrategy` | select | `one_by_one` \| `all_at_end` |
| `inviteCode` | text | unique; basis for per-participant submission token |
| `currentSession` | rel → course-sessions | nullable; populated when battle goes live |
| `createdAt` / `updatedAt` | timestamps | |

**Access**: read = club members (or anyone with the invite code for pop-ups); create = any authed user; update = host + club admins; delete = host + club owner.

#### `blind-battle-submissions`

One row per participant: wine they're bringing + presence + status.

| Field | Type | Notes |
|---|---|---|
| `battle` | rel → blind-battles | required |
| `user` | rel → users | nullable for pop-up guests |
| `guestEmail` | email | required when `user` is null |
| `guestName` | text | required when `user` is null |
| `systembolagetProduct` | rel → systembolaget-products | XOR with `customWine` |
| `customWine` | group | matches existing customWine snapshot shape (name, producer, vintage, type, priceSek, systembolagetUrl, imageUrl) |
| `pourOrder` | number | random slot 1–N assigned when the host opens the session. Surfaced to the submitter as their private "secret slot" (where to physically place their bottle) and used as the pour order during the tasting. |
| `submittedAt` | date | when the wine was picked |
| `revealedAt` | date | nullable; stamped at reveal time |
| `status` | select | `invited` \| `submitted` \| `declined` \| `no_show` |
| `submissionToken` | text | unique opaque token used in `/blindkamp/[id]/submit?token=...` |

Constraint: `(systembolagetProduct IS NOT NULL) XOR (customWine.name IS NOT NULL)` — same OR-validation pattern as Reviews/TastingPlans.

**Access**: read = battle host + club admins + the submitter themselves; create/update = the submitter via their token; delete = host.

### Reuse without modification

- **`course-sessions`** — runs the live in-person tasting. Battle links to one via `currentSession`. Existing timer, focus-current-wine, blind toggle, host controls all work as-is.
- **`reviews`** — each rating creates a Review attached to the session. Stars required; smell/taste/notes optional. Existing wrap-up email infrastructure inherits.
- **`systembolaget-products`** — submission picker.
- **`users`** — membership + ownership.

---

## URL structure

All Swedish, consistent with the rest of the app.

| URL | Purpose |
|---|---|
| `/vinklubbar` | List of clubs the viewer belongs to |
| `/vinklubbar/skapa` | Create a new club |
| `/vinklubbar/[slug]` | Club home — Översikt / Topplista / Historik tabs |
| `/vinklubbar/[slug]/installningar` | Club settings (owner + admins) |
| `/vinklubbar/[slug]/medlemmar` | Member management |
| `/vinklubbar/[slug]/anslut/[code]` | Member join via shareable link |
| `/blindkamp/skapa` | Create a new battle (optionally attached to a club) |
| `/blindkamp/[id]` | Battle home — status, theme, submission count, members |
| `/blindkamp/[id]/submit?token=...` | Per-participant private submission link |
| `/blindkamp/[id]/anslut/[code]` | Pop-up battle guest entry (name + email + submit) |
| `/blindkamp/[id]/provning` | Live session (reuses CourseSession UI) |
| `/blindkamp/[id]/resultat` | Post-session reveal + leaderboard for this battle |

---

## User flows

### Flow A — Club battle, end to end

1. **Create**: club owner / admin clicks "Skapa blindkamp" from club page. Sets theme (structured + description), submission deadline, session date, reveal strategy, who's invited (default: all members). Status: `draft` → `submissions_open`.

2. **Submit**: each member receives an email with a per-user submission link. They open `/blindkamp/[id]/submit?token=…`. Systembolaget picker is pre-filtered to the theme; free-text fallback available. They see a count ("3 av 6 har lämnat in") but never another member's pick. Submission can be edited until the deadline.

3. **Open session**: host clicks "Starta provningen" (gated until ≥ 2 submissions OR deadline passed). App generates a random `pourOrder` 1–N per submission. A CourseSession spins up and links to the battle. Status: `submissions_open` → `in_session`.

4. **Session ritual** (see next section).

5. **Tasting**: standard live session UI. Wines labeled "Vin #1, #2, …". Each player rates each wine — stars required, expandable for full review. Host advances through wines.

6. **Reveal**: host triggers it.
   - `one_by_one`: per-wine card flip showing actual bottle + submitter + average rating + individual ratings.
   - `all_at_end`: cards flip together, ranked by average; winner gets a "Vinnare" ribbon.
   - In both cases, the submitter of the winning wine earns a badge on the battle results page and a leaderboard point.

7. **Post-session**: existing wrap-up email triggers with battle results appended. Status: `in_session` → `completed`. Battle archives to club Historik.

### Flow B — Pop-up battle (no club)

Same as Flow A except:

- Host shares a single URL (`/blindkamp/[id]/anslut/[code]`) instead of email invites.
- Guests open the link, enter name + email, submit a wine via the same picker.
- No club leaderboard impact — results live on the battle's own `resultat` page only.
- After reveal, the result page surfaces a CTA: "Vill ni göra det här igen? Skapa en vinklubb." Converts casual hosts into club owners.
- Guest claim prompt (existing flow at `/aktivera-konto`) fires post-session for unclaimed emails.

---

## Session ritual — the "secret shuffle"

The hardest part of any blind tasting where participants are also contributors: every person knows what wine they brought. So bottles, not just glasses, must be hidden.

### The mechanic

1. **Wrapping**: each participant arrives with their bottle in an opaque wine sleeve, paper bag, or foil + tube sock — anything that hides shape and label. The battle setup page recommends a cheap reusable set and links to a couple of options.

2. **Secret slot assignment**: when the host clicks "Starta provningen", the app generates a random slot 1–N per submission and writes it to `submissions.pourOrder`. Each participant's phone immediately shows a private screen: *"Din hemliga plats: #4. Ställ din inslagna flaska där när värden räknar ner."* Only that participant sees their slot.

3. **Synchronized placement**: host's screen shows a 3-second countdown button. When triggered, all phones show the same countdown. All N participants walk to the table and place their wrapped bottle in their assigned slot simultaneously. No one can map slot ← person by watching.

4. **Pour**: bottles are now in random slots, identity-blind to everyone. Host (or anyone) pours from slot 1 into every glass, then slot 2, etc.

5. **Self-rating fairness**: each participant knows where their own bottle landed. The app *shows* their own wine in the rating UI (so they get a personal note in their journal), but their self-rating is **excluded from the wine's leaderboard average**. Surfaced visually with a tag: "Detta är ditt bidrag — ditt eget betyg räknas inte mot snittet."

### Fallback — "neutral helper"

For groups that don't want phone choreography (older crowd, low signal, kids running around), the host can toggle "Använd en neutral hjälpare" on the session-open screen. App then displays a single host-script card: *"Be någon som inte ska smaka att blanda och numrera de inslagna flaskorna 1–N. Skriv in numreringen nedan när det är klart."* The host enters which submitter ended up at which slot. Same outcome.

### Ease-of-understanding principle

Both rituals get a "Hur funkar det?" link on the relevant screens that opens a one-screen explainer with three illustrations (wrap → secret slot → pour). Aim: anyone can run their first battle without reading more than four sentences total.

---

## Club page

`/vinklubbar/[slug]` — three tabs.

### Översikt

- Hero stats: member count, battles played, current champion (with their best wine thumbnail).
- Next battle card — either the scheduled upcoming battle or a "Skapa nästa blindkamp" CTA.
- Recent activity feed: last 5 battles + member joins.

### Topplista (leaderboard)

| Column | Detail |
|---|---|
| Position | Gold / silver / bronze pips for top 3 |
| Member | Avatar + name |
| **Vinster** | Battles won (primary sort) |
| **Snittbetyg** | Mean rating across all submitted wines (self-ratings excluded) |
| **Bidrag** | Total submissions across all completed battles |
| **Bästa vin** | Highest-rated single submission ever, with tiny bottle thumbnail |

Time-range toggle: All-time / This year / Last 6 months.

Members with fewer than 3 completed battles are listed but marked **"Nybörjare"** with no rank position, to avoid one-hit-wonder distortion.

### Historik

Chronological list of all completed battles. Each row: theme, date, winner, link to results page.

---

## Scoring rules (intentionally simple)

- **Vinst** = your wine had the highest average rating in a battle. Tie → split (both win, both get +1).
- **Snittbetyg** = mean of all star ratings your wines have received, excluding your self-ratings.
- That's it. Two numbers anyone gets at a glance. No weighted points, no decay.

---

## Permissions

| Action | Who |
|---|---|
| Create wine club | Any authed user |
| Edit club details, invite/remove members | Owner + admins |
| Promote member to admin | Owner only |
| Transfer ownership | Owner only |
| Create battle inside club | Any club member (default; configurable per-club later) |
| Edit / cancel battle | Battle host + club owner |
| Submit / edit own wine | Submitter, until deadline |
| View other submitters' wines | After reveal only |
| Trigger session start, advance wines, trigger reveal | Battle host |
| Create pop-up battle | Any authed user |
| Join pop-up battle | Anyone with the invite link |

No premium gating in v1.

---

## Email touchpoints (v1 minimum)

Reuse existing `payload.sendEmail` + Resend infrastructure and the existing email primitives (`emailBrandOrange`, `emailHeaderCellStyle`, `emailPrimaryCtaButton`, `escapeHtml`).

| Email | Trigger | Audience |
|---|---|---|
| Battle invitation | Host clicks "Skicka inbjudningar" | Each invited member, with their unique submission link |
| Submission deadline approaching | Cron, 24h before deadline | Members with `status: invited` |
| Battle results | Existing wrap-up email infrastructure, augmented | All participants |

Out of v1: reminder cadence beyond the single 24h-before nudge.

---

## Open decisions

These need a call before the plan; flagging because they're real product calls, not implementation details.

1. **Submission edit window**: can a submitter change their wine after the deadline if the session hasn't started yet? Recommend **no** — deadline is final, otherwise the "deadline" loses meaning.

2. **Minimum submissions to open session**: 2 (minimum viable battle) or 3 (avoids degenerate cases)? Recommend **2** — pop-ups with 2 people happen.

3. **Theme enforcement strictness**: warn-and-allow vs hard-block on theme mismatch. Recommend **warn-and-allow** ("Detta vin matchar inte temat — vill du fortsätta?") for both Systembolaget picks and free-text. Hard-blocking gets in the way of "I couldn't find one under 150 kr, here's 152 kr."

4. **Self-rating exclusion presentation**: should the app *hide* the submitter's own wine at rating time, or *show* it with a "räknas inte mot snittet" tag? Recommend **show with tag** so the submitter still gets a personal note in their journal.

5. **Club member cap**: any limit on club size? Recommend **none in v1** — most clubs are 4–12 anyway. Revisit if abuse appears.

---

## UX principles

- **Single primary action per screen.** No competing CTAs. The next step is always the most prominent button.
- **"Hur funkar det?" links** on every state with a non-obvious mechanic. Each opens a one-screen explainer with at most 3 illustrations and 4 sentences.
- **No emoji in user-facing copy** (matches existing policy).
- **Swedish everywhere**, including button labels in screenshots and error states.
- **Reveal is a moment**, not a paragraph. The transition from blind to revealed gets dedicated animation budget — not over-the-top, but unmistakably a payoff beat.

---

## Out of scope for v1 (Phase 2 candidates)

- Social-share result cards / public battle pages
- Badges / achievements ("Förstavinst", "5 i rad")
- Curated theme library + monthly suggested themes
- Vote-in-advance on next theme
- Multi-bottle submissions
- Battle templates / "reuse last theme"
- Cross-club global leaderboards
- Photo upload per submission
- In-session chat / discussion threads
- Pre-session reminders cadence beyond the initial invite
- Premium gating (revisit after launch — currently entirely free)
- Wine pairing / food suggestions
- Aggregate analytics (club-level statistics, member retention, theme popularity)

---

## Migration & rollout

- Three new collections → one migration. Standard `pnpm migrate:create` flow.
- No backfill needed (greenfield feature).
- Add nav entry "Vinklubbar" alongside existing "Mina sidor" / "Mina provningar".
- Soft launch: announce to existing Vinakademin+ members first via email. Watch dashboard signals: club creations, battles started, battles completed, average submissions per battle.
- PostHog events to add: `wine_club_created`, `blind_battle_created`, `blind_battle_submission_made`, `blind_battle_session_started`, `blind_battle_revealed`, `blind_battle_completed`. These attach to the existing launch dashboard.

---

## Success criteria (90 days post-launch)

- ≥ 25 wine clubs created
- ≥ 50 blind battles completed (clubs + pop-ups combined)
- ≥ 70% of started battles reach the reveal step (no abandonment between session-open and reveal)
- Average submissions per battle ≥ 4 (signal that groups are actually playing, not just one-person tests)
