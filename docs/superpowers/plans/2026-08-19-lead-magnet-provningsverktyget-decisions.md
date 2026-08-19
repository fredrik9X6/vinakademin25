# Decision log — Provningsverktyget lead magnet

Every call made autonomously while executing
`docs/superpowers/plans/2026-08-19-lead-magnet-provningsverktyget.md`.
Preserved from the execution ledger so the reasoning survives the scratch workspace.

# SDD ledger — plan: docs/superpowers/plans/2026-08-19-lead-magnet-provningsverktyget.md

Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md
Branch: feat/provningsverktyget-lead-magnet (feature branch in primary working dir;
  worktree declined by Fredrik — node_modules + untracked .env are needed for the
  `pnpm build` verification every task ends with)
Baseline: test:ia 31 pass, test:session 33 pass, test:vinkompassen 5 pass. Clean.

## Pre-flight conflict scan

### Cross-task: shared files / interfaces

| Tasks | Produces → Consumes | Finding |
|---|---|---|
| T1 → T2 | `resolveTemplateAccess` semantics (free=public, paid=account) → T2 flips all data to `free`, default `free` | Consistent |
| T2 → T4 | collection marks `priceSek`/`isFreeTrial` dormant → T4 removes their UI reads | Consistent |
| T2 → T3 | T2 kills the collection's Stripe sync → T3 410s the checkout route | Different files, complementary |
| T3 → T4 | T3 makes `/kop` a redirect → T4 removes the links that pointed at it | Consistent, order-independent |
| T4 → T7 | `TemplateCard` props `{template, href?}` unchanged by T4 → T7 renders `<TemplateCard>` | Consistent (T4 changes internals only) |
| T4 → T4 | `LockedTemplateDetailViewProps` drops `priceSek` → same task updates the call site (Step 3) | Consistent |
| T5 → T5 | `ProvningarFilterState` drops `access` → same task updates module, tests, gallery page | Consistent |
| T7 → T8 | route `/provningsverktyget` → nav links to it | Order correct (7 before 8) |
| T8 → T9 | nav label Vinkurser→Vinkvällen → homepage + gallery metadata rename | Consistent |
| T9 → T10 | homepage "499 kr · för hela sällskapet" + 500–1000 anchor → sales page same values | Consistent |
| T10 → T11 | sales page renders the course subheadline → T11 sets it in Payload | **DEFECT — see ruling 1** |

### Per-task: internal self-consistency

| Task | Finding |
|---|---|
| T1 | Tests match implementation; unused-param note is explicit. Consistent |
| T2 | Field edits + migration + data flip agree. Consistent |
| T3 | Step 1 code block imports `redirect` then the note says remove it. Cosmetic; note is explicit. Consistent |
| T4 | Props change and call-site update are both in-task. Consistent |
| T5 | Tests-first ordering correct (update tests → fail → fix module → pass). Consistent |
| T6 | Two defaults + copy. Consistent |
| T7 | Self-contained; carries a fallback if NewsletterSignupBlock differs. Consistent |
| T8 | Prose says "keep it to four" above a 3-entry array. **See ruling 2** |
| T9 | Consistent |
| T10 | Consistent (given ruling 1) |
| T11 | Manual admin task, no commit. Consistent |
| T12 | Sweep + walkthrough. Consistent |

## Rulings

Ruling 1: `CourseOverview.tsx:369,427` renders `course.shortDescription`, but the
  Vinkurser collection has no `shortDescription` field — the column is `description`,
  and the course is spread in as `...course`. The value is always `undefined`, so the
  `&&` guard hides it: the sales-page subheadline never renders today. Task 11's
  repositioned copy would therefore be invisible. Decision: fold the fix into Task 10
  — render `course.description || course.shortDescription`, mirroring the existing
  precedent at `src/lib/course-enrollment-utils.ts:36`. Also widen the prop type to
  include `description?: string`. Cost if wrong: a one-line revert; the alternative
  (shipping as planned) makes the entire repositioning invisible on the page it matters
  most.
Ruling 2: Task 8's prose "keep it to four" sits above a three-entry tab array. The
  array as written is the current one with two labels changed, which is correct — the
  fourth slot is the "Min sida" button rendered separately. Decision: the array is
  authoritative, the prose is descriptive of the finished bar. No plan change. Cost if
  wrong: an implementer adds a fourth tab; the task review catches it.

## Progress

Task 1: implemented (commit ba475b0, 5/5 tests pass) — review dispatched, BASE 405ac49
Task 1: complete (commits 405ac49..ba475b0, review clean — spec ✅, quality Approved)
  ⚠️ resolved 1: brief said "four call sites" for canUseTemplate; there are three
    (from-template route, [slug] page, kop page). My miscount in the plan. No code impact.
  ⚠️ resolved 2: reviewer flagged that kop/page.tsx becomes dead for logged-in users.
    Confirmed handled — Task 3 Step 1 replaces that file with a permanentRedirect.
Task 1: minor (deferred): plan/brief "four call sites" wording is off by one.
Ruling 3: I assumed Payload applied select `defaultValue` application-side only, and
  considered hand-writing a data-only migration to avoid connecting to the production DB
  (.env IS prod). Checked the live schema: `access_level` carries a real column default
  ('paid'::enum_tasting_templates_access_level), so the field change DOES produce a schema
  delta and a hand-written data-only migration would be insufficient. Decision: Task 2 runs
  `pnpm migrate:create` as the plan says. It introspects schema read-only and does not apply
  anything (push is opt-in via PAYLOAD_DB_PUSH, unset here). The implementer is forbidden from
  running any apply command, and must re-verify the column default is untouched afterwards.
  Cost if wrong: an unintended write to production schema — mitigated by the explicit ban on
  apply commands and the post-check.
Task 2: implemented (commit 577f4f9) — migration 20260819_121447_templates_all_free
  (ALTER COLUMN SET DEFAULT 'free' + UPDATE all rows). Prod DB verified unmutated 3x.
Ruling 4: the full Task 2 review package is 535KB, almost entirely Payload's generated
  .json schema snapshot plus regenerated payload-types.ts. Decision: hand the reviewer a
  scoped 11KB package covering only the hand-written files (TastingTemplates.ts, the
  migration .ts, migrations/index.ts), with the full stat summary included and the
  exclusions named. Generated artifacts are verified by `pnpm generate:types` + `pnpm build`,
  both of which passed. Cost if wrong: a defect hiding in generated output — low, since
  neither file is hand-editable and the build compiles against both.
Task 2: complete (commits ba475b0..577f4f9, review clean — spec ✅, quality Approved)
Task 2: minor (deferred → routed into Task 12, not the final review):
  (a) TastingTemplates.ts:196-197 accessLevel option labels still say "Fri – alla kan se utan
      köp" / "Betald – kräver köp eller prenumeration", contradicting the new description.
  (b) TastingTemplates.ts:233 stripeProductId description still claims auto-generation via
      syncTemplateWithStripe, whose trigger was just removed.
Ruling 5: both Minors are stale copy in a file Task 12 already sweeps. Decision: add them
  explicitly to Task 12's brief rather than parking them for the final review, so they are
  fixed in the task designed for exactly this. Cost if wrong: nothing — if Task 12 misses
  them, the final whole-branch review still sees this ledger line.
Task 3: review ❌ — 3 Important (2 plan-mandated, 1 implementer gap), 1 Minor.
  ⚠️ resolved: reviewer asked whether a frontend call site still hits /api/payments/
    template-checkout. Checked: the only caller is TemplateBuyConfirmation.tsx:33, and
    nothing renders that component any more (Task 3 replaced the kop page that did).
    The 410 is unreachable from the UI. No action needed.
Ruling 6 (finding 1, plan-mandated): my brief told the implementer to reuse the purchase
  branch's log wording in the refund branch, producing a line that calls a refund a purchase
  inside handleChargeRefunded — in a real-money file. The reviewer is right and my plan
  caused it. Decision: FIX. Cost if wrong: none; the corrected wording is strictly more
  accurate.
Ruling 7 (finding 2, plan-mandated): the seven now-unused imports in template-checkout are
  deliberate — the brief preserved them for one-commit revertibility. Decision: KEEP them,
  but add an explicit comment saying they are retained on purpose, which answers the
  reviewer's real concern (a future reader cannot distinguish deliberate from sloppy).
  Cost if wrong: a little dead weight in a dormant route; lint and build are unaffected
  (no-unused-vars is off repo-wide, tsconfig sets neither noUnusedLocals nor
  noUnusedParameters).
Ruling 8 (Minor, warn-level noise): the endpoint is unreachable from the UI, so the warn can
  only fire on a direct POST — which is exactly when we want to know. Decision: keep as warn.
Task 3: fix round 1/5 (3 addressed, 0 open — refund log wording, documented import retention,
  stale JSDoc replaced; commits 6630955..3757a4c)
Task 3: complete (commits 577f4f9..3757a4c, re-review clean — all findings addressed, no new breakage)
Task 4: implemented (commit 0728510, DONE_WITH_CONCERNS). Agent died mid-self-review on a
  transient Cloudflare 521; tree was intact, resumed and it finished. My unrelated plan edit
  was committed separately as 69b5794 first so it would not pollute the task commit.
  Implementer concern: my brief enumerated three buy-CTA sites in LockedTemplateDetailView
  but there was a FOURTH — the header pill beside the title, "Köp för {price}". It chose
  "Kräver konto". Sent to the reviewer to judge rather than pre-approved.
Task 4: complete (commits 69b5794..0728510, review clean — spec ✅, quality Approved).
  Reviewer independently validated the improvised header-pill copy and confirmed the
  props-interface change at its sole call site. Also noted the diff incidentally fixed a
  pre-existing next=/from= redirect-param inconsistency between the two components.
Task 4: minor (routed into Task 12): LockedTemplateDetailView.tsx:161 header pill reads
  "Kräver konto" while every sibling CTA leads with gratis — reads as a soft paywall.
Task 5: review ❌ — 2 Important, both plan-mandated (my brief's defects), 0 Minor.
Ruling 9 (finding 1): my brief's "keep the wrapper if it has other children" test was
  structural, but the only remaining child is {isAdmin && ...}, so for non-admins — the common
  case on the main gallery page — the div renders empty and still contributes mb-4. A real
  visible layout regression this task caused. Decision: FIX, gate on `wantsTemplates && isAdmin`.
  Cost if wrong: none; the div has no other purpose.
Ruling 10 (finding 2): my brief deleted the test commented as "the regression this module
  exists for" (patching one filter must not silently reset view/tag) because its fixture used
  `access`, and I never asked for a replacement using a surviving filter. Reviewer confirmed
  no remaining test covers tag-preservation-across-a-patch on a non-default view. That is a
  genuine coverage regression on the module's whole reason to exist. Decision: FIX, add an
  equivalent test using tag/status. Cost if wrong: none; it restores coverage the suite had
  before this task.
Task 5: fix round 1/5 (2 addressed, 0 open — admin wrapper gated on isAdmin, regression test
  restored using status/tag and verified to fail when the bug is reintroduced; commits
  6964755..e27fb82)
Task 5: complete (commits 501f153..e27fb82, re-review clean — 31/31 tests)
Task 6: complete (commits e27fb82..a21550b, review clean — spec ✅, quality Approved)
Ruling 11: my plan's Task 7 JSX rendered <NewsletterSignupBlock /> with no props. Checked the
  component: every prop is optional but the defaults are ENGLISH ("Stay Updated with Wine
  Knowledge", "Subscribe Now", "We respect your privacy. Unsubscribe at any time."), so the
  bare call would have shipped English marketing copy onto a Swedish landing page. Decision:
  pass explicit Swedish props following the homepage's existing usage pattern
  (page.tsx:471-479). Kept rather than removed — the plan Fredrik approved included it, and
  dropping a capture surface is his product call, not mine. Cost if wrong: a redundant
  email-only form competes slightly with the account CTA; trivially removable.
Task 7: implemented (commit 2340241, DONE_WITH_CONCERNS, 312 lines). Implementer ran the dev
  server and verified every section against 3 real Payload templates.
  Concern raised: claims TemplateCard clips ~84px at 375px, hiding the "Gratis" badge on
  mobile, and calls it pre-existing on the homepage. I checked the markup before accepting it:
  both call sites use plain `grid gap-* sm:grid-cols-2 lg:grid-cols-3` (single column at
  375px, full container width), and the badge is `absolute top-2 right-2` inside a `relative`
  parent within a Card carrying `overflow-hidden` — no mechanism for horizontal clipping.
  ProvningsmallarFeature.tsx:24 does contain a 420px decorative blur div inside an
  `overflow-hidden` section, which a naive scrollWidth probe would report as overflow while
  being visually contained. Sent to the reviewer with these facts and no verdict.
Task 7: complete (commits 7d10985..2340241, review clean — spec ✅, quality Approved).
  Reviewer diffed the page byte-for-byte against the brief: zero differences.
Ruling 12: I judged the implementer's mobile-overflow claim structurally implausible. I WAS
  WRONG. The reviewer reproduced it in a live browser with measurements (scrollWidth 420 vs
  clientWidth 341; badge right-edge 427.9px vs visible bound 374px). Mechanism: `truncate` on
  the card title sets white-space:nowrap → intrinsic min-content width; the grid item is
  TemplateCard.tsx:24's root <Link>, which lacks min-width:0 (Card already HAS min-w-0, so the
  implementer's own attribution was also off); CSS Grid automatic minimum sizing expands the
  track past the viewport, and <main overflow-x-hidden> in (site)/layout.tsx:19 clips it
  silently. Confirmed live on the homepage too via ProvningsmallarFeature.tsx:65.
  Decision: FIX in Task 12 — add `min-w-0` to the <Link> at TemplateCard.tsx:24. This hides
  the "Gratis" badge, which is the whole free-tier signal, on mobile. Pre-existing, but this
  project is what made that badge load-bearing. Cost if wrong: a one-class revert.
Task 7: minor (noted, no action): my Task 7 brief said the `as never` cast matches
  (site)/page.tsx's precedent; that file actually uses `as any`. Functionally identical.
Task 8: review ✅ spec / Approved, but 1 Important (plan-mandated) + 2 Minor.
Ruling 13 (Important, plan-mandated): my brief's own snippet kept `GraduationCap` for the
  renamed "Vinkvällen" tab, and the code comment above it still argues "a cap reads as 'a
  course'" — asserting in code the exact framing this rename exists to kill, on the most-viewed
  nav surface. Decision: FIX. Switch to `PlayCircle`, which is already the course's glyph on
  the homepage OfferingsComparison card and is on-message (the films host the evening).
  Rejected `Users` (collides with Mina vinklubbar in the same drawer) and `Wine` (taken by
  Provningar). Cost if wrong: an icon swap.
Ruling 14 (2 Minors bundled into the same round): both live in the same file as ruling 13's
  fix — a stale pre-rename comment at :218 and Wrench-vs-Hammer inconsistency with the landing
  page's own tool glyph. Minors normally go to the ledger, not the loop, but bundling same-file
  one-liners into a round that is already happening costs nothing and avoids a second pass.
Task 8: fix round 1/5 (3 addressed, 0 open — PlayCircle replaces GraduationCap on both
  surfaces + rationale rewritten, Hammer replaces Wrench, stale comment updated; commits
  80c647b..bd8e50e)
Task 8: complete (commits 913f57b..bd8e50e, re-review clean)
Task 8: open gap for Task 12's walkthrough: nobody has literally verified the mobile bottom
  bar at 375px — the implementer's browser tooling floors at ~528px. Layout math says fine
  (3 tabs, min-w-64px, no flex-wrap, and the one changed label got shorter).
Task 9: implemented (commit e810487, DONE_WITH_CONCERNS). Verified file scope myself: exactly
  the 5 briefed files; SingleCourseHero is a component inside VinkurserFeature.tsx, not a 6th
  file. Implementer disclosed it authored its own Swedish copy for ProvningsmallarFeature and
  VinkurserFeature (my brief gave intent, not verbatim strings for those two) and widened
  VinkurserFeature edits to benefit chips / footer count / hero badge. Sent to review with
  the copy explicitly in scope for scrutiny.
Task 9: review ✅ spec / Approved, 0 Critical/Important, 5 Minor.
Ruling 15: Minors normally go to the ledger rather than the fix loop, but finding 1 is a
  dropped verb ("hela sällskapet med" missing "är") in user-facing homepage copy — a visible
  grammatical error, which on its own warrants a round. The other four are one-liners in the
  same two files, so including them costs nothing versus a second pass. Decision: one fix
  round covering all five, rather than routing them to Task 12 (which is already carrying
  four other items). Cost if wrong: one extra cheap round.
  Sub-decisions: "kvällar att boka" → "att välja mellan" (the site has real bookable live
  sessions elsewhere, so "boka" sets a scheduling expectation this self-serve video purchase
  does not meet); restore the "engångsbetalning" signal alongside "för hela sällskapet",
  since the site also sells subscriptions and that distinction is worth keeping.
Task 9: fix round 1/5 (5 addressed, 0 open — verb restored, two stale comments, "att välja
  mellan", engångsbetalning restored; commits e810487..80909df)
Task 9: complete (commits bd8e50e..80909df, re-review clean)
Task 10: review ✅ spec / Approved, 1 Important, 2 Minor.
Ruling 16 (Important): formatPrice at CourseOverview.tsx:184 renders "499,00 kr" while the
  homepage and landing page both say "499 kr" for the same product — and on this page the
  decimalised price sits two lines above the round-number anchor "500–1000 kr per person".
  The reviewer flagged it Important and offered the controller the option to downgrade.
  Decision: FIX. This page's entire job is to make 499 read as an obvious deal against that
  anchor, and a stray ",00" both weakens the comparison and contradicts what a visitor just
  saw elsewhere. The fix (omit fraction digits for whole values) lives in the same file the
  task already authorized, so it is in scope and does not hardcode the price.
  Cost if wrong: prices elsewhere in this file lose decimals they never needed — SEK course
  prices are whole numbers.
Task 10: minor (no action): decorative Check icons lack aria-hidden, but this matches the
  file's existing CheckCircle convention — a file-wide sweep someday, not this task.
Task 10: minor (no action): the .btn-brand rationale comment was removed, which the brief
  explicitly instructed.
Task 10: fix round 1/5 (1 addressed, 0 open — formatPrice drops fraction digits for whole
  krona, öre preserved; commits 4173459..c28decb)
Task 10: complete (commits 80909df..c28decb, re-review clean)
Ruling 17: Task 11 (rewriting the course title/description in Payload) will NOT be executed by
  me. .env points at the PRODUCTION database and the course is published, so editing it would
  change live marketing copy immediately — on a site still running the old code. That is an
  outward-facing change to Fredrik's published product and his call to make. Decision: hand
  him the exact Swedish copy in the final report instead. Cost if wrong: the repositioning is
  incomplete until he pastes it; nothing breaks, since Task 10 fixed the subheadline so the
  copy will render the moment it exists.
Ruling 18: Task 12's walkthrough steps that CREATE a production account are also cut from the
  agent's scope. Registering a test user writes a Users row and a Subscribers row to the prod
  DB and pushes a contact to Beehiiv — a third-party service. Decision: the agent does the code
  fixes and the logged-out walkthrough (read-only); the signup walkthrough and the subscriber
  DB verification are deferred to Fredrik. Cost if wrong: the end-to-end signup path stays
  unverified by us — stated plainly in the final report rather than glossed.
Task 12: implemented (commit a66c238, DONE_WITH_CONCERNS). All suites green: test:access 5/5,
  test:ia 31/31, lint 0, build 0. No accounts created, no DB writes.
Ruling 19: the sweep found TemplateBuyConfirmation.tsx orphaned and could not delete it (the
  sandbox blocked rm). Decision: KEEP it — deletion would have been wrong anyway. It is the UI
  half of the retired purchase flow, and it sits alongside the deliberately dormant /kop route,
  the 410 checkout endpoint, TemplateEntitlements and syncTemplateWithStripe. Deleting it would
  break the "revivable in one commit" property every other task preserved. Cost if wrong: one
  unreferenced component file.
Task 12: open gap — 375px still not literally verified; the agent's browser floored at 500px
  (485px content). At 500px the Gratis badge is visible and nothing overflows. Fredrik should
  spot-check a real phone.
Task 12: expected, not a defect — 2 of 4 published templates still gate logged-out visitors on
  the connected DB, because the templates_all_free migration has not been applied there yet.
  It runs via migrate.yml CI on deploy.
Task 12: review ❌ — 1 Important, 2 Minor.
Ruling 20 (Important): reviewer found TemplateDetailView.tsx:85-93 renders a "Medlem" pill
  with a Lock icon for accessLevel==='paid' templates, and "Fri" otherwise. Two problems:
  "Medlem" implies paid membership, which is now false, and 2 of 4 live templates hit that
  branch today; and a padlock on the UNLOCKED view is incoherent — this component only renders
  once the viewer already has full access. Decision: FIX by collapsing the ternary entirely.
  The free/paid distinction now only governs whether an anonymous visitor gets in, so by the
  time this view renders it carries no meaning worth badging. Single "Gratis" badge in
  TemplateCard's emerald style. This also resolves the reviewer's Minor 2 (Gratis/Fri/Kräver
  gratiskonto drift) by standardising on "Gratis". Cost if wrong: one badge loses a distinction
  nobody can act on.
Ruling 21 (Minor 1): restore the "Stripe Prices are immutable" note to stripePriceId's
  description alongside the PAUSAD text — institutional knowledge worth keeping for a revival.
Task 12: fix round 1/5 (2 addressed, 0 open — badge ternary collapsed to a single "Gratis",
  Lock import removed, Stripe immutability note restored; commits a66c238..2b5b3a8)
Task 12: complete (commits 0107e62..2b5b3a8, re-review clean)
Task 11: NOT EXECUTED by design — see Ruling 17. Handed to Fredrik with exact copy.
ALL TASKS COMPLETE. Proceeding to final whole-branch review.
FINAL WHOLE-BRANCH REVIEW: no Critical. Access model verified sound end to end; migration safe;
  dormancy coherent; zero invented "värde" figures; guarantee backed by villkor/page.tsx:113.
  5 Important + 10 Minor.
Ruling 22: my plan never touched NeuralHeroWithBanner.tsx, so the homepage hero still leads
  "Lär dig om vin" / "Se vinkurser" / "Engångsbetalning" directly above the new "Gratis"
  section — the most-seen element on the site contradicting the page beneath it. A genuine gap
  in my Section 5 ripple list. FIX in the wave.
Ruling 23: /vinkurser's H1 still reads "Vinkurser" while every nav entry, both homepage cards
  and the landing page's handoff now say "Vinkvällen" and point at it. My plan changed only
  that page's metadata. FIX.
Ruling 24: two false claims on the landing page — "obegränsat antal gäster" (code hard-caps at
  50 in StartSessionButton.tsx:85 and rejects at the cap in api/sessions/join) and "visar
  totalpriset" (TemplateDetailView renders per-wine prices, never a total). Both mine. FIX by
  rewording to what the code actually does — not by building new features to match the copy.
Ruling 25: sitemap omission — /provningsverktyget is the branch's one organic-acquisition page
  and was crawlable only via nav. FIX, plus add it to api/revalidate commonPaths.
Ruling 26 (Minor 9, was owner's call): switch /kop from permanentRedirect (308) to redirect
  (307). Browsers cache 308 forever, which permanently breaks the "revivable in one commit"
  property this whole branch preserved everywhere else. The route is noindex and unlinked, so
  the SEO cost of 307 is nil. FIX.
Ruling 27: deferred to Fredrik, not fixed here — nav now carries both "Provningsverktyget" and
  "Vinprovningar" (5 top-nav items, and the mobile tab says "Provningar" while the drawer says
  "Vinprovningar"). That is an information-architecture decision about his own product, not a
  defect I should settle unilaterally.
Ruling 28: deferred — priceSek/isFreeTrial were given PAUSAD descriptions but not moved into a
  collapsed admin group as spec §1.3 suggested. Functionally identical; not worth a migration
  or churn now.
Ruling 29: not fixed — checkout dialog still says "Köp vinkurs" after "Boka vår vinkväll".
  Plan-mandated: spec §4.7 deliberately scoped the rewrite to the sales page and metadata.
  Flagging to Fredrik as a known seam rather than widening scope at the last step.
FINAL FIX WAVE: complete (commit fd087bd), re-review clean — all 9 findings addressed, no new
  breakage. Out-of-scope observations noted for Fredrik: "Inga vinkurser tillgängliga" empty-state
  copy on /vinkurser still uses retired framing (only renders at zero published courses), and the
  "Gratis för alltid" newsletter disclaimer persists on the homepage and /nyhetsbrev — both
  pre-existing and outside this branch.
BRANCH COMPLETE.
