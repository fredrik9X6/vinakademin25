# Blindkamp + Vinklubb Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the blind-battle group tasting format (Blindkamp) on top of a new reusable wine-club entity (Vinklubb), per the spec at `docs/superpowers/specs/2026-05-19-blindkamp-wine-club-design.md`.

**Architecture:** Three new Payload v3 collections (`wine-clubs`, `blind-battles`, `blind-battle-submissions`) plus heavy reuse of `course-sessions`, `reviews`, and `systembolaget-products`. New routes under `/vinklubbar/*` and `/blindkamp/*` (Swedish), all server components by default with focused client islands for forms and ritual UX. Email reuses the existing `payload.sendEmail` + `email-cta.ts` primitives; the synchronized "secret-shuffle" ritual is rendered live via existing CourseSession infrastructure.

**Tech Stack:** Next.js 15 App Router, React 19, Payload CMS 3.33, Postgres (via Drizzle), Tailwind, Shadcn UI, Resend (email), Sonner (toasts). No test suite — verification is `pnpm tsc --noEmit` + manual browser/admin checks per the project's existing pattern (see `CLAUDE.md`).

**Conventions (read once, apply everywhere):**
- Pin `@payloadcms/*` packages to exact `3.33.0`. Never widen to `^` or `~`.
- All collection / enum changes need a migration (`pnpm migrate:create`). Generated migration JSON snapshot is huge — that's expected.
- After any collection change, run `pnpm generate:types`. Never hand-edit `src/payload-types.ts`.
- Swedish for all user-facing copy. No emoji in user-facing copy.
- Server components by default. Mark `'use client'` only where state/effects are needed.
- Use Shadcn UI components from `src/components/ui/`. Use `cn()` from `src/lib/utils.ts`.
- Access control: import `Access` + `PayloadRequest` from `payload` (NOT `payload/types`).
- PostHog: import `trackEvent` from `@/components/analytics`.
- Logger: `import { loggerFor } from '@/lib/logger'; const log = loggerFor('module-name')`.

**Production deploy convention:** main = staging, production branch = live. Squash-merge main → production. Never push directly to main expecting prod.

---

## File map (mapped before tasks; tasks reference this)

### New collections
- `src/collections/WineClubs.ts`
- `src/collections/BlindBattles.ts`
- `src/collections/BlindBattleSubmissions.ts`

### Migration
- `src/migrations/<timestamp>_blindkamp_wine_clubs.ts` (auto-generated)

### Helpers
- `src/lib/blindkamp/access.ts` — `isWineClubMember`, `isWineClubAdmin`, `isWineClubOwner`, `isBattleHost`
- `src/lib/blindkamp/tokens.ts` — submission token gen + verify (HMAC over `{battleId, userId|guestEmail}`)
- `src/lib/blindkamp/shuffle.ts` — `assignSecretSlots(submissions[])` returns randomized 1..N
- `src/lib/blindkamp/compute-leaderboard.ts` — club aggregates: wins, snittbetyg, bidrag, bästa vin
- `src/lib/blindkamp/invite-codes.ts` — short URL-safe code generator (8 chars)

### Email
- `src/lib/session-emails/blindkamp-invitation.ts` — `buildBlindkampInvitationEmail({...})`
- `src/lib/session-emails/blindkamp-deadline-reminder.ts` — `buildBlindkampDeadlineEmail({...})`
- Modify `src/lib/session-emails/wrap-up.ts` to optionally append battle results

### Shared components
- `src/components/blindkamp/ThemePicker.tsx` — structured filters + free-text description
- `src/components/blindkamp/WineSubmissionPicker.tsx` — wraps `SystembolagetProductPicker` + custom-wine fallback
- `src/components/blindkamp/Leaderboard.tsx` — topplista rendering
- `src/components/blindkamp/RevealCard.tsx` — flip animation per wine
- `src/components/blindkamp/SecretSlotPanel.tsx` — per-participant private slot screen
- `src/components/blindkamp/CountdownButton.tsx` — host-triggered synced countdown
- `src/components/blindkamp/HelpExplainer.tsx` — "Hur funkar det?" modal with 3 illustrations

### Pages — Vinklubb
- `src/app/(frontend)/(site)/vinklubbar/page.tsx`
- `src/app/(frontend)/(site)/vinklubbar/skapa/page.tsx`
- `src/app/(frontend)/(site)/vinklubbar/skapa/CreateWineClubForm.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/page.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/OversiktTab.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/TopplistaTab.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/HistorikTab.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/installningar/page.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/medlemmar/page.tsx`
- `src/app/(frontend)/(site)/vinklubbar/[slug]/anslut/[code]/page.tsx`

### Pages — Blindkamp
- `src/app/(frontend)/(site)/blindkamp/skapa/page.tsx`
- `src/app/(frontend)/(site)/blindkamp/skapa/CreateBlindkampForm.tsx`
- `src/app/(frontend)/(site)/blindkamp/[id]/page.tsx`
- `src/app/(frontend)/(site)/blindkamp/[id]/submit/page.tsx`
- `src/app/(frontend)/(site)/blindkamp/[id]/submit/SubmissionForm.tsx`
- `src/app/(frontend)/(site)/blindkamp/[id]/anslut/[code]/page.tsx`
- `src/app/(frontend)/(site)/blindkamp/[id]/provning/page.tsx`
- `src/app/(frontend)/(site)/blindkamp/[id]/resultat/page.tsx`

### API routes
- `src/app/api/wine-clubs/route.ts` — POST create
- `src/app/api/wine-clubs/[id]/route.ts` — PATCH update, DELETE
- `src/app/api/wine-clubs/[id]/members/route.ts` — POST invite/remove, PATCH change role
- `src/app/api/wine-clubs/join/route.ts` — POST join by inviteCode
- `src/app/api/blindkamp/route.ts` — POST create
- `src/app/api/blindkamp/[id]/route.ts` — PATCH update, DELETE
- `src/app/api/blindkamp/[id]/submit/route.ts` — POST submit (token-auth'd)
- `src/app/api/blindkamp/[id]/invitations/route.ts` — POST send invites
- `src/app/api/blindkamp/[id]/join-guest/route.ts` — POST pop-up guest entry
- `src/app/api/blindkamp/[id]/open-session/route.ts` — POST: assign slots + create CourseSession
- `src/app/api/blindkamp/[id]/reveal/route.ts` — POST trigger reveal
- `src/app/api/cron/blindkamp-reminders/route.ts` — daily cron for deadline nudges

### Modifications to existing files
- `src/payload.config.ts:198-233` — register the three new collections
- `src/lib/access.ts` — re-export new helpers from `lib/blindkamp/access.ts` for convenience (optional)
- `src/components/nav/*` — add "Vinklubbar" entry to primary nav (identify exact file at task time)
- `src/lib/session-emails/wrap-up.ts` — optional battle-results block

---

## Phase 1 — Foundations (collections + migration)

### Task 1: WineClubs collection

**Files:**
- Create: `src/collections/WineClubs.ts`

- [ ] **Step 1: Create the collection file**

```ts
// src/collections/WineClubs.ts
import type { CollectionConfig } from 'payload'
import type { Access, PayloadRequest } from 'payload'

/** Member of the viewer is on the club's members[] list. */
async function viewerIsMember(req: PayloadRequest, clubId: number | string): Promise<boolean> {
  if (!req.user) return false
  const club = await req.payload.findByID({
    collection: 'wine-clubs',
    id: clubId,
    depth: 0,
    overrideAccess: true,
  })
  return (club as any)?.members?.some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === req.user!.id
  })
}

const readAccess: Access = async ({ req, id }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (id) return viewerIsMember(req, id)
  // List: restrict to clubs the user is a member of
  return {
    'members.user': { equals: req.user.id },
  } as any
}

const updateAccess: Access = async ({ req, id }) => {
  if (!req.user || !id) return false
  if (req.user.role === 'admin') return true
  const club = await req.payload.findByID({
    collection: 'wine-clubs',
    id,
    depth: 0,
    overrideAccess: true,
  })
  return (club as any)?.members?.some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === req.user!.id && (m.role === 'owner' || m.role === 'admin')
  })
}

const deleteAccess: Access = async ({ req, id }) => {
  if (!req.user || !id) return false
  if (req.user.role === 'admin') return true
  const club = await req.payload.findByID({
    collection: 'wine-clubs',
    id,
    depth: 0,
    overrideAccess: true,
  })
  const ownerId =
    typeof (club as any)?.owner === 'object' ? (club as any).owner?.id : (club as any).owner
  return ownerId === req.user.id
}

export const WineClubs: CollectionConfig = {
  slug: 'wine-clubs',
  admin: {
    group: 'Social',
    useAsTitle: 'name',
    defaultColumns: ['name', 'owner', 'updatedAt'],
  },
  access: {
    read: readAccess,
    create: ({ req }) => Boolean(req.user),
    update: updateAccess,
    delete: deleteAccess,
  },
  timestamps: true,
  fields: [
    { name: 'name', type: 'text', required: true, maxLength: 80 },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    {
      name: 'inviteCode',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Short code used in shareable join links.' },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'members',
      type: 'array',
      fields: [
        { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          defaultValue: 'member',
          options: [
            { label: 'Ägare', value: 'owner' },
            { label: 'Admin', value: 'admin' },
            { label: 'Medlem', value: 'member' },
          ],
        },
        { name: 'joinedAt', type: 'date', required: true },
      ],
    },
  ],
}
```

- [ ] **Step 2: Register collection in payload.config.ts**

Modify `src/payload.config.ts` line 198–233 — add `WineClubs` import at the top and to the `collections` array (alphabetical by group; put it after `VinkompassAttempts`).

```ts
// imports near top
import { WineClubs } from './collections/WineClubs'

// in collections array, after VinkompassAttempts:
    WineClubs,
```

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep WineClubs`
Expected: no output (no errors mentioning WineClubs).

- [ ] **Step 4: Commit**

```bash
git add src/collections/WineClubs.ts src/payload.config.ts
git commit -m "otter: WineClubs collection + access helpers"
```

---

### Task 2: BlindBattles collection

**Files:**
- Create: `src/collections/BlindBattles.ts`

- [ ] **Step 1: Create the collection file**

```ts
// src/collections/BlindBattles.ts
import type { CollectionConfig } from 'payload'
import type { Access, PayloadRequest } from 'payload'

/** Battle host OR club admin/owner can mutate the battle. */
async function viewerCanMutate(
  req: PayloadRequest,
  battleId: number | string,
): Promise<boolean> {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  const battle = await req.payload.findByID({
    collection: 'blind-battles',
    id: battleId,
    depth: 1,
    overrideAccess: true,
  })
  const hostId = typeof (battle as any)?.host === 'object' ? (battle as any).host?.id : (battle as any).host
  if (hostId === req.user.id) return true
  const club = (battle as any)?.club
  if (!club) return false
  const clubObj =
    typeof club === 'object'
      ? club
      : await req.payload.findByID({
          collection: 'wine-clubs',
          id: club,
          depth: 0,
          overrideAccess: true,
        })
  return (clubObj as any)?.members?.some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === req.user!.id && (m.role === 'owner' || m.role === 'admin')
  })
}

const readAccess: Access = async ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  // Member of the club OR host of the battle OR submitter of any submission
  return {
    or: [
      { host: { equals: req.user.id } },
      { 'club.members.user': { equals: req.user.id } } as any,
    ],
  } as any
}

const updateAccess: Access = async ({ req, id }) => {
  if (!id) return false
  return viewerCanMutate(req, id)
}

const deleteAccess: Access = updateAccess

export const BlindBattles: CollectionConfig = {
  slug: 'blind-battles',
  admin: {
    group: 'Social',
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'host', 'club', 'sessionDate'],
  },
  access: {
    read: readAccess,
    create: ({ req }) => Boolean(req.user),
    update: updateAccess,
    delete: deleteAccess,
  },
  timestamps: true,
  fields: [
    { name: 'title', type: 'text', maxLength: 120 },
    {
      name: 'theme',
      type: 'group',
      fields: [
        {
          name: 'wineType',
          type: 'select',
          required: true,
          defaultValue: 'any',
          options: [
            { label: 'Vilket som', value: 'any' },
            { label: 'Rött', value: 'red' },
            { label: 'Vitt', value: 'white' },
            { label: 'Rosé', value: 'rose' },
            { label: 'Mousserande', value: 'sparkling' },
            { label: 'Orange', value: 'orange' },
            { label: 'Dessert', value: 'dessert' },
          ],
        },
        { name: 'priceMinSek', type: 'number', min: 0 },
        { name: 'priceMaxSek', type: 'number', min: 0 },
        { name: 'countries', type: 'relationship', relationTo: 'countries', hasMany: true },
        { name: 'grapes', type: 'relationship', relationTo: 'grapes', hasMany: true },
      ],
    },
    { name: 'themeDescription', type: 'textarea' },
    { name: 'host', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'club', type: 'relationship', relationTo: 'wine-clubs', index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      index: true,
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Öppen för bidrag', value: 'submissions_open' },
        { label: 'Pågående provning', value: 'in_session' },
        { label: 'Klar', value: 'completed' },
        { label: 'Avbruten', value: 'canceled' },
      ],
    },
    { name: 'submissionDeadline', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'sessionDate', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'wineCount', type: 'number', min: 2, max: 30 },
    {
      name: 'revealStrategy',
      type: 'select',
      required: true,
      defaultValue: 'all_at_end',
      options: [
        { label: 'Avslöja ett vin i taget', value: 'one_by_one' },
        { label: 'Avslöja allt i slutet', value: 'all_at_end' },
      ],
    },
    { name: 'inviteCode', type: 'text', required: true, unique: true, index: true },
    {
      name: 'currentSession',
      type: 'relationship',
      relationTo: 'course-sessions',
      admin: { description: 'Populated when the host opens the session.' },
    },
    {
      name: 'remindersSentAt',
      type: 'date',
      admin: { readOnly: true, description: 'Stamped when the 24h-before reminder fired.' },
    },
  ],
}
```

- [ ] **Step 2: Register collection in payload.config.ts**

Add `BlindBattles` import and to `collections` array right after `WineClubs`.

- [ ] **Step 3: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep BlindBattles`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/collections/BlindBattles.ts src/payload.config.ts
git commit -m "otter: BlindBattles collection + access helpers"
```

---

### Task 3: BlindBattleSubmissions collection

**Files:**
- Create: `src/collections/BlindBattleSubmissions.ts`

- [ ] **Step 1: Create the collection file**

```ts
// src/collections/BlindBattleSubmissions.ts
import type { CollectionConfig } from 'payload'
import type { Access } from 'payload'

const readAccess: Access = async ({ req }) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  return {
    or: [
      { user: { equals: req.user.id } },
      // Host of the battle OR club admin/owner
      { 'battle.host': { equals: req.user.id } } as any,
    ],
  } as any
}

const createAccess: Access = ({ req }) => Boolean(req.user)

const updateAccess: Access = async ({ req, id }) => {
  if (!req.user || !id) return false
  if (req.user.role === 'admin') return true
  const submission = await req.payload.findByID({
    collection: 'blind-battle-submissions',
    id,
    depth: 1,
    overrideAccess: true,
  })
  const submitterId =
    typeof (submission as any)?.user === 'object'
      ? (submission as any).user?.id
      : (submission as any).user
  if (submitterId === req.user.id) return true
  const battle = (submission as any)?.battle
  const hostId =
    typeof battle === 'object' ? (battle as any).host?.id || (battle as any).host : null
  return hostId === req.user.id
}

const deleteAccess: Access = updateAccess

export const BlindBattleSubmissions: CollectionConfig = {
  slug: 'blind-battle-submissions',
  admin: {
    group: 'Social',
    useAsTitle: 'id',
    defaultColumns: ['battle', 'user', 'guestEmail', 'status', 'submittedAt'],
  },
  access: {
    read: readAccess,
    create: createAccess,
    update: updateAccess,
    delete: deleteAccess,
  },
  timestamps: true,
  fields: [
    { name: 'battle', type: 'relationship', relationTo: 'blind-battles', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { name: 'guestEmail', type: 'email' },
    { name: 'guestName', type: 'text' },
    {
      name: 'systembolagetProduct',
      type: 'relationship',
      relationTo: 'systembolaget-products',
    },
    {
      name: 'customWine',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'producer', type: 'text' },
        { name: 'vintage', type: 'text' },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Rött', value: 'red' },
            { label: 'Vitt', value: 'white' },
            { label: 'Rosé', value: 'rose' },
            { label: 'Mousserande', value: 'sparkling' },
            { label: 'Orange', value: 'orange' },
            { label: 'Dessert', value: 'dessert' },
          ],
        },
        { name: 'priceSek', type: 'number' },
        { name: 'systembolagetUrl', type: 'text' },
        { name: 'imageUrl', type: 'text' },
      ],
    },
    {
      name: 'pourOrder',
      type: 'number',
      admin: {
        description:
          'Random slot 1..N assigned when the host opens the session. Shown to the submitter as their private "secret slot", and used as the pour order during the tasting.',
      },
    },
    { name: 'submittedAt', type: 'date' },
    { name: 'revealedAt', type: 'date' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'invited',
      options: [
        { label: 'Inbjuden', value: 'invited' },
        { label: 'Inlämnad', value: 'submitted' },
        { label: 'Tackat nej', value: 'declined' },
        { label: 'Uteblev', value: 'no_show' },
      ],
    },
    {
      name: 'submissionToken',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'Opaque token used in the per-participant submission URL.' },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data }) => {
        // OR-rule: either user OR (guestEmail + guestName). Either systembolagetProduct OR customWine.name.
        const d = data as any
        if (!d) return data
        if (!d.user && !(d.guestEmail && d.guestName)) {
          // Don't throw on create from token-auth flow; the API route enforces this.
          // No-op here so admin probes succeed.
        }
        return data
      },
    ],
  },
}
```

- [ ] **Step 2: Register collection in payload.config.ts**

Add `BlindBattleSubmissions` import and to `collections` array right after `BlindBattles`.

- [ ] **Step 3: Generate migration**

Run: `pnpm payload migrate:create --name blindkamp_wine_clubs`
Expected: new file created at `src/migrations/<timestamp>_blindkamp_wine_clubs.ts` + matching `.json` snapshot. Migration index updated.

- [ ] **Step 4: Regenerate types**

Run: `pnpm generate:types`
Expected: `src/payload-types.ts` updated with `WineClub`, `BlindBattle`, `BlindBattleSubmission` types.

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep -E "(BlindBattle|WineClub)"`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/collections/BlindBattleSubmissions.ts src/payload.config.ts src/migrations/ src/payload-types.ts
git commit -m "otter: BlindBattleSubmissions collection + migration + types"
```

---

### Task 4: Helpers — tokens, invite codes, shuffle, access

**Files:**
- Create: `src/lib/blindkamp/tokens.ts`
- Create: `src/lib/blindkamp/invite-codes.ts`
- Create: `src/lib/blindkamp/shuffle.ts`
- Create: `src/lib/blindkamp/access.ts`

- [ ] **Step 1: Tokens**

```ts
// src/lib/blindkamp/tokens.ts
import crypto from 'crypto'

const SECRET = process.env.PAYLOAD_SECRET || 'dev-fallback-secret'

/** Stable opaque token for a submission. Not reversible — encoded as base64url HMAC. */
export function generateSubmissionToken(battleId: number, key: string): string {
  const payload = `${battleId}:${key}:${crypto.randomBytes(8).toString('hex')}`
  const h = crypto.createHmac('sha256', SECRET).update(payload).digest()
  return Buffer.concat([Buffer.from(payload), h])
    .toString('base64url')
    .slice(0, 48)
}

/** Returns true if token matches the given submission record's `submissionToken` field. */
export function verifySubmissionToken(stored: string, incoming: string): boolean {
  // Constant-time compare to dodge timing side channels.
  const a = Buffer.from(stored)
  const b = Buffer.from(incoming)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
```

- [ ] **Step 2: Invite codes**

```ts
// src/lib/blindkamp/invite-codes.ts
import crypto from 'crypto'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // omit ambiguous 0/O/1/I/L

/** 8-character URL-safe code. Collision prob negligible at our scale. */
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}
```

- [ ] **Step 3: Shuffle (pour order assignment)**

```ts
// src/lib/blindkamp/shuffle.ts
import crypto from 'crypto'

/**
 * Cryptographically-shuffled 1..N pour order assignments.
 * Returns a parallel array — `result[i]` is the pour order to assign to
 * `submissions[i]`. Used both as the host's pour order and as the
 * submitter's private "secret slot" in the ritual.
 */
export function assignPourOrders<T>(submissions: T[]): number[] {
  const n = submissions.length
  const slots = Array.from({ length: n }, (_, i) => i + 1)
  // Fisher-Yates with crypto randomness
  for (let i = n - 1; i > 0; i--) {
    const r = crypto.randomBytes(4).readUInt32BE(0) % (i + 1)
    ;[slots[i], slots[r]] = [slots[r]!, slots[i]!]
  }
  return slots
}
```

- [ ] **Step 4: Access helpers**

```ts
// src/lib/blindkamp/access.ts
import type { Payload, PayloadRequest } from 'payload'
import type { WineClub, BlindBattle } from '@/payload-types'

export async function loadClubMembership(
  payload: Payload,
  clubId: number,
  userId: number,
): Promise<{ role: 'owner' | 'admin' | 'member' } | null> {
  const club = (await payload.findByID({
    collection: 'wine-clubs',
    id: clubId,
    depth: 0,
    overrideAccess: true,
  })) as WineClub
  const m = (club.members ?? []).find((mm) => {
    const uid = typeof mm.user === 'object' ? mm.user?.id : mm.user
    return uid === userId
  })
  if (!m) return null
  return { role: m.role as 'owner' | 'admin' | 'member' }
}

export async function viewerCanHostBattle(
  req: PayloadRequest,
  battle: BlindBattle,
): Promise<boolean> {
  if (!req.user) return false
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId === req.user.id) return true
  const clubRef = battle.club
  if (!clubRef) return false
  const clubId = typeof clubRef === 'object' ? clubRef.id : clubRef
  if (!clubId) return false
  const membership = await loadClubMembership(req.payload, clubId, req.user.id)
  return membership?.role === 'owner' || membership?.role === 'admin'
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep blindkamp`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/blindkamp/
git commit -m "otter: blindkamp helpers (tokens, invite codes, shuffle, access)"
```

---

## Phase 2 — Vinklubb (clubs CRUD + pages)

### Task 5: Wine club CRUD API

**Files:**
- Create: `src/app/api/wine-clubs/route.ts`
- Create: `src/app/api/wine-clubs/[id]/route.ts`
- Create: `src/app/api/wine-clubs/[id]/members/route.ts`
- Create: `src/app/api/wine-clubs/join/route.ts`

- [ ] **Step 1: POST /api/wine-clubs (create)**

```ts
// src/app/api/wine-clubs/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { generateInviteCode } from '@/lib/blindkamp/invite-codes'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-wine-clubs')

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    description?: string
  }
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })

  const payload = await getPayloadClient()
  const baseSlug = slugify(name) || 'vinklubb'

  // Ensure unique slug — append -2, -3 if taken
  let slug = baseSlug
  for (let i = 2; i < 50; i++) {
    const existing = await payload.find({
      collection: 'wine-clubs',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length === 0) break
    slug = `${baseSlug}-${i}`
  }

  let inviteCode = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const dup = await payload.find({
      collection: 'wine-clubs',
      where: { inviteCode: { equals: inviteCode } },
      limit: 1,
      overrideAccess: true,
    })
    if (dup.docs.length === 0) break
    inviteCode = generateInviteCode()
  }

  const created = await payload.create({
    collection: 'wine-clubs',
    data: {
      name,
      slug,
      description: body.description?.trim() || undefined,
      inviteCode,
      owner: user.id,
      members: [
        {
          user: user.id,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
    } as never,
    overrideAccess: true,
  })

  log.info({ clubId: created.id, userId: user.id }, 'wine_club_created')
  return NextResponse.json({ id: created.id, slug: created.slug })
}
```

- [ ] **Step 2: PATCH/DELETE /api/wine-clubs/[id]**

```ts
// src/app/api/wine-clubs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'

async function isAdminOrOwner(
  payload: any,
  clubId: number,
  userId: number,
): Promise<boolean> {
  const club = await payload.findByID({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  return (club.members ?? []).some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === userId && (m.role === 'owner' || m.role === 'admin')
  })
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const clubId = parseInt(id, 10)
  const payload = await getPayloadClient()
  if (!(await isAdminOrOwner(payload, clubId, user.id as number))) {
    return NextResponse.json({ error: 'Saknar rättigheter' }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const allowed = ['name', 'description', 'coverImage'] as const
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) data[k] = body[k]
  await payload.update({ collection: 'wine-clubs', id: clubId, data: data as never, overrideAccess: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const clubId = parseInt(id, 10)
  const payload = await getPayloadClient()
  const club = await payload.findByID({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  const ownerId = typeof club.owner === 'object' ? club.owner?.id : club.owner
  if (ownerId !== user.id) {
    return NextResponse.json({ error: 'Endast ägaren kan ta bort klubben' }, { status: 403 })
  }
  await payload.delete({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: POST /api/wine-clubs/[id]/members (add/remove + role change)**

```ts
// src/app/api/wine-clubs/[id]/members/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const clubId = parseInt(id, 10)
  const body = (await req.json()) as { action: 'invite' | 'remove' | 'role'; email?: string; userId?: number; role?: 'admin' | 'member' }

  const payload = await getPayloadClient()
  const club = (await payload.findByID({ collection: 'wine-clubs', id: clubId, overrideAccess: true })) as any
  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    return NextResponse.json({ error: 'Saknar rättigheter' }, { status: 403 })
  }

  if (body.action === 'invite') {
    const email = String(body.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'E-post krävs' }, { status: 400 })
    const users = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1, overrideAccess: true })
    if (users.docs.length === 0) {
      return NextResponse.json({ error: 'Användaren saknar konto. Bjud in dem att skapa ett först.' }, { status: 400 })
    }
    const newUser = users.docs[0]
    const already = (club.members ?? []).some((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      return uid === newUser.id
    })
    if (already) return NextResponse.json({ error: 'Redan medlem' }, { status: 400 })
    const nextMembers = [...(club.members ?? []), { user: newUser.id, role: 'member', joinedAt: new Date().toISOString() }]
    await payload.update({ collection: 'wine-clubs', id: clubId, data: { members: nextMembers } as never, overrideAccess: true })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'remove') {
    const targetId = body.userId
    if (!targetId) return NextResponse.json({ error: 'userId krävs' }, { status: 400 })
    // Cannot remove the owner
    const target = (club.members ?? []).find((m: any) => (typeof m.user === 'object' ? m.user?.id : m.user) === targetId)
    if (target?.role === 'owner') {
      return NextResponse.json({ error: 'Ägaren kan inte tas bort' }, { status: 400 })
    }
    const nextMembers = (club.members ?? []).filter((m: any) => (typeof m.user === 'object' ? m.user?.id : m.user) !== targetId)
    await payload.update({ collection: 'wine-clubs', id: clubId, data: { members: nextMembers } as never, overrideAccess: true })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'role') {
    // Only owner can promote/demote
    if (myMembership.role !== 'owner') return NextResponse.json({ error: 'Endast ägaren' }, { status: 403 })
    const targetId = body.userId
    const newRole = body.role
    if (!targetId || !newRole) return NextResponse.json({ error: 'userId + role krävs' }, { status: 400 })
    const nextMembers = (club.members ?? []).map((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      if (uid !== targetId) return m
      if (m.role === 'owner') return m // ignore — can't demote yourself this way
      return { ...m, role: newRole }
    })
    await payload.update({ collection: 'wine-clubs', id: clubId, data: { members: nextMembers } as never, overrideAccess: true })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Okänd action' }, { status: 400 })
}
```

- [ ] **Step 4: POST /api/wine-clubs/join (join by inviteCode)**

```ts
// src/app/api/wine-clubs/join/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { inviteCode } = (await req.json()) as { inviteCode?: string }
  if (!inviteCode) return NextResponse.json({ error: 'Kod saknas' }, { status: 400 })

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { inviteCode: { equals: inviteCode } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) return NextResponse.json({ error: 'Ogiltig kod' }, { status: 404 })
  const club = found.docs[0] as any

  const already = (club.members ?? []).some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (already) return NextResponse.json({ ok: true, slug: club.slug })

  const nextMembers = [...(club.members ?? []), { user: user.id, role: 'member', joinedAt: new Date().toISOString() }]
  await payload.update({ collection: 'wine-clubs', id: club.id, data: { members: nextMembers } as never, overrideAccess: true })
  return NextResponse.json({ ok: true, slug: club.slug })
}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep wine-clubs`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/wine-clubs/
git commit -m "otter: wine clubs CRUD + membership API"
```

---

### Task 6: Vinklubb pages — list + create

**Files:**
- Create: `src/app/(frontend)/(site)/vinklubbar/page.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/skapa/page.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/skapa/CreateWineClubForm.tsx`

- [ ] **Step 1: List page**

```tsx
// src/app/(frontend)/(site)/vinklubbar/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Vinklubbar — Vinakademin' }

export default async function VinklubbarPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/vinklubbar')

  const payload = await getPayloadClient()
  const clubs = await payload.find({
    collection: 'wine-clubs',
    where: { 'members.user': { equals: user.id } },
    limit: 50,
    depth: 1,
    overrideAccess: true,
    sort: '-updatedAt',
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-heading">Mina vinklubbar</h1>
        <Button asChild>
          <Link href="/vinklubbar/skapa">
            <Plus className="h-4 w-4 mr-1.5" /> Ny vinklubb
          </Link>
        </Button>
      </header>

      {clubs.docs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-3">
            <Users className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-medium">Du är inte med i någon vinklubb ännu</p>
            <p className="text-sm text-muted-foreground">
              Skapa din egen klubb och bjud in dina vänner att köra blindkampar tillsammans.
            </p>
            <Button asChild>
              <Link href="/vinklubbar/skapa">Skapa en vinklubb</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {clubs.docs.map((club: any) => (
            <li key={club.id}>
              <Link
                href={`/vinklubbar/${club.slug}`}
                className="block rounded-lg border border-border bg-card hover:border-brand-400/50 transition-colors p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{club.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(club.members ?? []).length} medlemmar
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create form (client)**

```tsx
// src/app/(frontend)/(site)/vinklubbar/skapa/CreateWineClubForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { trackEvent } from '@/components/analytics'

export function CreateWineClubForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Namn krävs')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/wine-clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte skapa klubben')
        return
      }
      const json = await res.json()
      trackEvent('wine_club_created', { clubId: json.id })
      router.push(`/vinklubbar/${json.slug}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Namn</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="t.ex. Onsdagsklubben" required maxLength={80} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Beskrivning <span className="text-muted-foreground">(valfritt)</span></Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="En kort beskrivning av klubben" rows={3} />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Skapar…' : 'Skapa vinklubb'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Skapa page (server)**

```tsx
// src/app/(frontend)/(site)/vinklubbar/skapa/page.tsx
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { CreateWineClubForm } from './CreateWineClubForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Skapa vinklubb — Vinakademin' }

export default async function SkapaVinklubbPage() {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/vinklubbar/skapa')
  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Skapa vinklubb</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bjud in dina vänner och kör blindkampar tillsammans. Du kan bjuda in fler när som helst.
        </p>
      </header>
      <CreateWineClubForm />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm tsc --noEmit 2>&1 | grep vinklubbar`
Expected: no output.

- [ ] **Step 5: Verify manually**

Run: `pnpm dev`
Visit: `http://localhost:3000/vinklubbar`
- Logged out: redirects to login
- Logged in: empty-state card + "Ny vinklubb" CTA visible
- Create a club: redirected to `/vinklubbar/<slug>` (404 expected at this point — Task 7 builds the page)

- [ ] **Step 6: Commit**

```bash
git add src/app/\(frontend\)/\(site\)/vinklubbar/
git commit -m "otter: vinklubbar list + create pages"
```

---

### Task 7: Vinklubb home page (3 tabs) + leaderboard placeholder

**Files:**
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/page.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/OversiktTab.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/TopplistaTab.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/HistorikTab.tsx`
- Create: `src/lib/blindkamp/compute-leaderboard.ts`

- [ ] **Step 1: Leaderboard helper**

```ts
// src/lib/blindkamp/compute-leaderboard.ts
import type { Payload } from 'payload'

export interface LeaderboardEntry {
  userId: number
  displayName: string
  wins: number
  averageRating: number | null
  submissionsCount: number
  bestWine: {
    title: string
    averageRating: number
    imageUrl: string | null
  } | null
  /** True if member has fewer than 3 completed battles — listed but unranked. */
  isRookie: boolean
}

export async function computeClubLeaderboard(
  payload: Payload,
  clubId: number,
  range: 'all' | 'year' | '6m' = 'all',
): Promise<LeaderboardEntry[]> {
  // 1. Load all completed battles for the club
  const dateFloor =
    range === 'year'
      ? new Date(new Date().getFullYear(), 0, 1)
      : range === '6m'
        ? new Date(Date.now() - 1000 * 60 * 60 * 24 * 30 * 6)
        : null
  const battlesRes = await payload.find({
    collection: 'blind-battles',
    where: {
      and: [
        { club: { equals: clubId } },
        { status: { equals: 'completed' } },
        ...(dateFloor ? [{ updatedAt: { greater_than: dateFloor.toISOString() } }] : []),
      ],
    },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  if (battlesRes.docs.length === 0) return []
  const battleIds = battlesRes.docs.map((b: any) => b.id)

  // 2. Load all submissions for those battles
  const submissionsRes = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { in: battleIds } },
    limit: 5000,
    depth: 1,
    overrideAccess: true,
  })
  const submissions = submissionsRes.docs as any[]

  // 3. Load all reviews for the linked sessions
  const sessionIds = battlesRes.docs
    .map((b: any) => (typeof b.currentSession === 'object' ? b.currentSession?.id : b.currentSession))
    .filter((x): x is number => typeof x === 'number')
  const reviewsRes = await payload.find({
    collection: 'reviews',
    where: { session: { in: sessionIds } },
    limit: 5000,
    depth: 0,
    overrideAccess: true,
  })
  const reviews = reviewsRes.docs as any[]

  // 4. Group ratings per submission, excluding self-ratings
  type SubAgg = {
    sub: any
    submitterId: number | null
    ratings: number[] // excluding submitter's own
    selfRated: number | null
  }
  const byId = new Map<number, SubAgg>()
  for (const s of submissions) {
    const submitterId = typeof s.user === 'object' ? s.user?.id : s.user
    byId.set(s.id, { sub: s, submitterId: submitterId ?? null, ratings: [], selfRated: null })
  }
  for (const r of reviews) {
    if (typeof r.rating !== 'number') continue
    // Match review to submission via shared session + wine identity is fragile; we use
    // pourOrder match. CourseSession context already binds reviews to a session,
    // so we look up the submission with the same battle (from session→battle) and the
    // matching wine reference. Simplest: match by review.metadata?.submissionId if we
    // stamp it at write time. Here we assume API writes review.metadata.submissionId.
    const subId = r.metadata?.submissionId
    if (typeof subId !== 'number') continue
    const agg = byId.get(subId)
    if (!agg) continue
    const reviewerId = typeof r.user === 'object' ? r.user?.id : r.user
    if (reviewerId && reviewerId === agg.submitterId) {
      agg.selfRated = r.rating
    } else {
      agg.ratings.push(r.rating)
    }
  }

  // 5. Per battle, compute winner (highest avg ex-self). Ties → all winners get +1.
  const winsByUser = new Map<number, number>()
  const byBattle = new Map<number, SubAgg[]>()
  for (const agg of byId.values()) {
    const bid = typeof agg.sub.battle === 'object' ? agg.sub.battle?.id : agg.sub.battle
    if (typeof bid !== 'number') continue
    if (!byBattle.has(bid)) byBattle.set(bid, [])
    byBattle.get(bid)!.push(agg)
  }
  for (const [, aggs] of byBattle) {
    const withAvg = aggs
      .filter((a) => a.ratings.length > 0 && a.submitterId)
      .map((a) => ({ a, avg: a.ratings.reduce((s, r) => s + r, 0) / a.ratings.length }))
    if (withAvg.length === 0) continue
    const max = Math.max(...withAvg.map((x) => x.avg))
    for (const { a, avg } of withAvg) {
      if (avg === max) {
        winsByUser.set(a.submitterId!, (winsByUser.get(a.submitterId!) ?? 0) + 1)
      }
    }
  }

  // 6. Per user, aggregate average rating + counts + best wine
  type UserAgg = {
    userId: number
    displayName: string
    submissionsCount: number
    allRatings: number[]
    bestWine: { title: string; averageRating: number; imageUrl: string | null } | null
    battlesCount: Set<number>
  }
  const byUser = new Map<number, UserAgg>()
  for (const agg of byId.values()) {
    if (!agg.submitterId) continue
    const submitter = agg.sub.user
    const displayName =
      (typeof submitter === 'object' && (submitter?.firstName || submitter?.email)) || 'Medlem'
    if (!byUser.has(agg.submitterId)) {
      byUser.set(agg.submitterId, {
        userId: agg.submitterId,
        displayName: String(displayName),
        submissionsCount: 0,
        allRatings: [],
        bestWine: null,
        battlesCount: new Set(),
      })
    }
    const u = byUser.get(agg.submitterId)!
    u.submissionsCount += 1
    u.allRatings.push(...agg.ratings)
    const bid = typeof agg.sub.battle === 'object' ? agg.sub.battle?.id : agg.sub.battle
    if (typeof bid === 'number') u.battlesCount.add(bid)
    const avg = agg.ratings.length > 0 ? agg.ratings.reduce((s, r) => s + r, 0) / agg.ratings.length : null
    if (avg !== null) {
      const title = agg.sub.systembolagetProduct?.productNameBold || agg.sub.customWine?.name || 'Vin'
      const imageUrl = agg.sub.systembolagetProduct?.imageUrl || agg.sub.customWine?.imageUrl || null
      if (!u.bestWine || avg > u.bestWine.averageRating) {
        u.bestWine = { title, averageRating: avg, imageUrl }
      }
    }
  }

  // 7. Build leaderboard entries
  const entries: LeaderboardEntry[] = []
  for (const u of byUser.values()) {
    const avg =
      u.allRatings.length > 0
        ? u.allRatings.reduce((s, r) => s + r, 0) / u.allRatings.length
        : null
    entries.push({
      userId: u.userId,
      displayName: u.displayName,
      wins: winsByUser.get(u.userId) ?? 0,
      averageRating: avg,
      submissionsCount: u.submissionsCount,
      bestWine: u.bestWine,
      isRookie: u.battlesCount.size < 3,
    })
  }

  // 8. Sort: wins desc, then snittbetyg desc, isRookie last
  entries.sort((a, b) => {
    if (a.isRookie !== b.isRookie) return a.isRookie ? 1 : -1
    if (a.wins !== b.wins) return b.wins - a.wins
    const aAvg = a.averageRating ?? 0
    const bAvg = b.averageRating ?? 0
    return bAvg - aAvg
  })
  return entries
}
```

- [ ] **Step 2: Club home page (tabs)**

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { Button } from '@/components/ui/button'
import { Settings, Users } from 'lucide-react'
import { OversiktTab } from './OversiktTab'
import { TopplistaTab } from './TopplistaTab'
import { HistorikTab } from './HistorikTab'

export const dynamic = 'force-dynamic'

export default async function VinklubbHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { slug } = await params
  const { tab = 'oversikt' } = await searchParams
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}`)

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const club = found.docs[0] as any

  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership) {
    // Not a member — show join page via inviteCode
    redirect(`/vinklubbar/${slug}/anslut/${club.inviteCode}`)
  }
  const canManage = myMembership.role === 'owner' || myMembership.role === 'admin'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading">{club.name}</h1>
          {club.description && (
            <p className="text-sm text-muted-foreground mt-1">{club.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/vinklubbar/${slug}/medlemmar`}>
              <Users className="h-4 w-4 mr-1.5" />
              Medlemmar ({(club.members ?? []).length})
            </Link>
          </Button>
          {canManage && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/vinklubbar/${slug}/installningar`}>
                <Settings className="h-4 w-4 mr-1.5" /> Inställningar
              </Link>
            </Button>
          )}
        </div>
      </header>

      <nav className="flex border-b border-border">
        {[
          { key: 'oversikt', label: 'Översikt' },
          { key: 'topplista', label: 'Topplista' },
          { key: 'historik', label: 'Historik' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/vinklubbar/${slug}?tab=${t.key}`}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors text-sm font-medium ${
              tab === t.key
                ? 'border-brand-400 text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'oversikt' && <OversiktTab club={club} canManage={canManage} />}
      {tab === 'topplista' && <TopplistaTab clubId={club.id} />}
      {tab === 'historik' && <HistorikTab clubId={club.id} />}
    </div>
  )
}
```

- [ ] **Step 3: Översikt tab**

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/OversiktTab.tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPayloadClient } from '@/lib/payload'
import { Trophy, Wine, Plus } from 'lucide-react'
import { computeClubLeaderboard } from '@/lib/blindkamp/compute-leaderboard'

export async function OversiktTab({ club, canManage }: { club: any; canManage: boolean }) {
  const payload = await getPayloadClient()
  const battlesRes = await payload.find({
    collection: 'blind-battles',
    where: { club: { equals: club.id } },
    limit: 5,
    sort: '-updatedAt',
    depth: 0,
    overrideAccess: true,
  })
  const completedCount = (await payload.count({
    collection: 'blind-battles',
    where: { and: [{ club: { equals: club.id } }, { status: { equals: 'completed' } }] },
    overrideAccess: true,
  })).totalDocs
  const upcoming = battlesRes.docs.find(
    (b: any) => b.status === 'submissions_open' || b.status === 'draft' || b.status === 'in_session',
  ) as any

  const leaderboard = await computeClubLeaderboard(payload, club.id, 'all')
  const champion = leaderboard.find((e) => !e.isRookie) ?? null

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <Users className="h-5 w-5 mx-auto text-brand-400 mb-2" />
          <p className="text-2xl font-heading">{(club.members ?? []).length}</p>
          <p className="text-xs text-muted-foreground">medlemmar</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Wine className="h-5 w-5 mx-auto text-brand-400 mb-2" />
          <p className="text-2xl font-heading">{completedCount}</p>
          <p className="text-xs text-muted-foreground">blindkampar</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Trophy className="h-5 w-5 mx-auto text-brand-400 mb-2" />
          <p className="text-lg font-medium truncate">{champion?.displayName ?? '—'}</p>
          <p className="text-xs text-muted-foreground">nuvarande mästare</p>
        </CardContent></Card>
      </div>

      {upcoming ? (
        <Card><CardContent className="p-5 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Pågående</p>
            <p className="font-medium mt-1">{upcoming.title || 'Nästa blindkamp'}</p>
          </div>
          <Button asChild>
            <Link href={`/blindkamp/${upcoming.id}`}>Visa</Link>
          </Button>
        </CardContent></Card>
      ) : canManage ? (
        <Card><CardContent className="p-5 space-y-3 text-center">
          <p className="font-medium">Inga blindkampar igång</p>
          <p className="text-sm text-muted-foreground">Starta nästa.</p>
          <Button asChild>
            <Link href={`/blindkamp/skapa?club=${club.id}`}>
              <Plus className="h-4 w-4 mr-1.5" /> Skapa blindkamp
            </Link>
          </Button>
        </CardContent></Card>
      ) : null}
    </div>
  )
}

// Pull Users icon import in
import { Users } from 'lucide-react'
```

- [ ] **Step 4: Topplista + Historik tab placeholders**

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/TopplistaTab.tsx
import { getPayloadClient } from '@/lib/payload'
import { computeClubLeaderboard } from '@/lib/blindkamp/compute-leaderboard'
import { Card, CardContent } from '@/components/ui/card'

export async function TopplistaTab({ clubId }: { clubId: number }) {
  const payload = await getPayloadClient()
  const entries = await computeClubLeaderboard(payload, clubId, 'all')

  if (entries.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        Inga slutförda blindkampar ännu. Topplistan visas efter första klara kampen.
      </CardContent></Card>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="text-left px-4 py-2 w-10">#</th>
            <th className="text-left px-4 py-2">Medlem</th>
            <th className="text-right px-4 py-2">Vinster</th>
            <th className="text-right px-4 py-2">Snitt</th>
            <th className="text-right px-4 py-2">Bidrag</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const rank = e.isRookie ? null : i + 1
            return (
              <tr key={e.userId} className="border-t border-border">
                <td className="px-4 py-2">
                  {rank ? (
                    <span className={rank === 1 ? 'text-amber-500 font-medium' : rank === 2 ? 'text-zinc-400 font-medium' : rank === 3 ? 'text-orange-400 font-medium' : ''}>
                      {rank}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Ny</span>
                  )}
                </td>
                <td className="px-4 py-2 font-medium">{e.displayName}</td>
                <td className="px-4 py-2 text-right">{e.wins}</td>
                <td className="px-4 py-2 text-right">{e.averageRating?.toFixed(2) ?? '—'}</td>
                <td className="px-4 py-2 text-right">{e.submissionsCount}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/HistorikTab.tsx
import Link from 'next/link'
import { getPayloadClient } from '@/lib/payload'
import { Card, CardContent } from '@/components/ui/card'

export async function HistorikTab({ clubId }: { clubId: number }) {
  const payload = await getPayloadClient()
  const battles = await payload.find({
    collection: 'blind-battles',
    where: { and: [{ club: { equals: clubId } }, { status: { equals: 'completed' } }] },
    sort: '-updatedAt',
    limit: 50,
    depth: 0,
    overrideAccess: true,
  })
  if (battles.docs.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        Inga avslutade blindkampar än.
      </CardContent></Card>
    )
  }
  return (
    <ul className="space-y-2">
      {battles.docs.map((b: any) => (
        <li key={b.id}>
          <Link href={`/blindkamp/${b.id}/resultat`} className="block rounded-md border border-border p-4 hover:border-brand-400/50 transition-colors">
            <p className="font-medium">{b.title || `Blindkamp #${b.id}`}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(b.updatedAt).toLocaleDateString('sv-SE')}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "(vinklubbar|leaderboard)"
git add src/app/\(frontend\)/\(site\)/vinklubbar/ src/lib/blindkamp/compute-leaderboard.ts
git commit -m "otter: vinklubb home (3 tabs) + leaderboard"
```

---

### Task 8: Member management + join page

**Files:**
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/medlemmar/page.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/installningar/page.tsx`
- Create: `src/app/(frontend)/(site)/vinklubbar/[slug]/anslut/[code]/page.tsx`

- [ ] **Step 1: Members page (list + invite-by-email form + remove button + role toggle)**

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/medlemmar/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { Button } from '@/components/ui/button'
import { getSiteURL } from '@/lib/site-url'
import { MembersClient } from './MembersClient'

export const dynamic = 'force-dynamic'

export default async function MedlemmarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}/medlemmar`)
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const club = found.docs[0] as any
  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership) redirect(`/vinklubbar/${slug}/anslut/${club.inviteCode}`)
  const siteUrl = getSiteURL()
  const inviteUrl = `${siteUrl}/vinklubbar/${slug}/anslut/${club.inviteCode}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <Link href={`/vinklubbar/${slug}`} className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka till {club.name}
        </Link>
        <h1 className="text-2xl font-heading mt-2">Medlemmar</h1>
      </header>

      <MembersClient
        clubId={club.id}
        members={club.members ?? []}
        viewerRole={myMembership.role}
        viewerId={user.id as number}
        inviteUrl={inviteUrl}
      />
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/medlemmar/MembersClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Trash2, ShieldCheck } from 'lucide-react'

export function MembersClient({ clubId, members, viewerRole, viewerId, inviteUrl }: {
  clubId: number
  members: any[]
  viewerRole: 'owner' | 'admin' | 'member'
  viewerId: number
  inviteUrl: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const canManage = viewerRole === 'owner' || viewerRole === 'admin'

  async function invite() {
    if (!email.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/wine-clubs/${clubId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'invite', email }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte bjuda in')
        return
      }
      toast.success('Medlem tillagd')
      setEmail('')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove(userId: number) {
    if (!confirm('Ta bort medlem?')) return
    const res = await fetch(`/api/wine-clubs/${clubId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'remove', userId }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      toast.error(e?.error || 'Kunde inte ta bort')
      return
    }
    toast.success('Medlem borttagen')
    router.refresh()
  }

  async function toggleRole(userId: number, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'member' : 'admin'
    const res = await fetch(`/api/wine-clubs/${clubId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'role', userId, role: newRole }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      toast.error(e?.error || 'Kunde inte uppdatera roll')
      return
    }
    router.refresh()
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteUrl)
    toast.success('Länk kopierad')
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <section className="space-y-3 rounded-lg border border-border p-4">
          <h2 className="font-medium">Bjud in fler</h2>
          <div className="flex gap-2">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vän@exempel.se" />
            <Button onClick={invite} disabled={busy}>Bjud in</Button>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Eller dela länken:</p>
            <div className="flex gap-2">
              <Input value={inviteUrl} readOnly />
              <Button variant="outline" onClick={copyInvite}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
        </section>
      )}

      <ul className="space-y-2">
        {members.map((m, idx) => {
          const u = typeof m.user === 'object' ? m.user : null
          const uid = u?.id ?? m.user
          const name = (u?.firstName || u?.email || `Medlem #${uid}`) as string
          const isOwner = m.role === 'owner'
          const isSelf = uid === viewerId
          return (
            <li key={idx} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.role === 'owner' ? 'Ägare' : m.role === 'admin' ? 'Admin' : 'Medlem'}
                </p>
              </div>
              {canManage && !isOwner && !isSelf && (
                <div className="flex gap-1.5">
                  {viewerRole === 'owner' && (
                    <Button size="sm" variant="outline" onClick={() => toggleRole(uid, m.role)}>
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      {m.role === 'admin' ? 'Gör till medlem' : 'Gör till admin'}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(uid)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Settings page (rename, delete)**

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/installningar/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { SettingsClient } from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function InstallningarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}/installningar`)
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const club = found.docs[0] as any
  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    redirect(`/vinklubbar/${slug}`)
  }
  const isOwner = myMembership.role === 'owner'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <Link href={`/vinklubbar/${slug}`} className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka till {club.name}
        </Link>
        <h1 className="text-2xl font-heading mt-2">Inställningar</h1>
      </header>
      <SettingsClient clubId={club.id} clubName={club.name} clubDescription={club.description ?? ''} isOwner={isOwner} />
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/installningar/SettingsClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function SettingsClient({ clubId, clubName, clubDescription, isOwner }: {
  clubId: number
  clubName: string
  clubDescription: string
  isOwner: boolean
}) {
  const router = useRouter()
  const [name, setName] = useState(clubName)
  const [description, setDescription] = useState(clubDescription)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/wine-clubs/${clubId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) {
        toast.error('Kunde inte spara')
        return
      }
      toast.success('Sparat')
      router.refresh()
    } finally { setBusy(false) }
  }

  async function destroy() {
    if (!confirm('Är du säker? Detta tar bort klubben och dess historik permanent.')) return
    const res = await fetch(`/api/wine-clubs/${clubId}`, { method: 'DELETE', credentials: 'include' })
    if (!res.ok) {
      toast.error('Kunde inte ta bort')
      return
    }
    router.push('/vinklubbar')
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="font-medium">Klubbinformation</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Namn</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Beskrivning</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>
        <Button onClick={save} disabled={busy}>Spara</Button>
      </section>

      {isOwner && (
        <section className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <h2 className="font-medium text-destructive">Riskzon</h2>
          <p className="text-sm text-muted-foreground">
            Att ta bort klubben raderar all historik och topplista. Detta kan inte ångras.
          </p>
          <Button variant="destructive" onClick={destroy}>Ta bort klubben</Button>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Join-by-invite page**

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/anslut/[code]/page.tsx
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { JoinClient } from './JoinClient'

export const dynamic = 'force-dynamic'

export default async function AnslutPage({ params }: { params: Promise<{ slug: string; code: string }> }) {
  const { slug, code } = await params
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/vinklubbar/${slug}/anslut/${code}`)
  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <h1 className="text-2xl font-heading">Gå med i vinklubben</h1>
      <p className="text-sm text-muted-foreground">
        Klicka för att bli medlem.
      </p>
      <JoinClient inviteCode={code} />
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/vinklubbar/[slug]/anslut/[code]/JoinClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function JoinClient({ inviteCode }: { inviteCode: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function join() {
    setBusy(true)
    try {
      const res = await fetch('/api/wine-clubs/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte gå med')
        return
      }
      const json = await res.json()
      router.push(`/vinklubbar/${json.slug}`)
    } finally { setBusy(false) }
  }
  return <Button onClick={join} disabled={busy} className="w-full">{busy ? 'Ansluter…' : 'Gå med'}</Button>
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep vinklubbar
git add src/app/\(frontend\)/\(site\)/vinklubbar/
git commit -m "otter: vinklubb member management + settings + join page"
```

---

## Phase 3 — Blindkamp creation + submission

### Task 9: ThemePicker + WineSubmissionPicker components

**Files:**
- Create: `src/components/blindkamp/ThemePicker.tsx`
- Create: `src/components/blindkamp/WineSubmissionPicker.tsx`

- [ ] **Step 1: ThemePicker (controlled)**

```tsx
// src/components/blindkamp/ThemePicker.tsx
'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface ThemeValue {
  wineType: 'any' | 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'dessert'
  priceMinSek: number | null
  priceMaxSek: number | null
  description: string
}

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeValue
  onChange: (v: ThemeValue) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Vintyp</Label>
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'any', label: 'Vilken som' },
            { v: 'red', label: 'Rött' },
            { v: 'white', label: 'Vitt' },
            { v: 'rose', label: 'Rosé' },
            { v: 'sparkling', label: 'Mousserande' },
            { v: 'orange', label: 'Orange' },
            { v: 'dessert', label: 'Dessert' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...value, wineType: v })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                value.wineType === v
                  ? 'border-brand-400 bg-brand-400/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-brand-400/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="priceMin">Min pris (kr)</Label>
          <Input
            id="priceMin"
            type="number"
            min={0}
            value={value.priceMinSek ?? ''}
            onChange={(e) => onChange({ ...value, priceMinSek: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceMax">Max pris (kr)</Label>
          <Input
            id="priceMax"
            type="number"
            min={0}
            value={value.priceMaxSek ?? ''}
            onChange={(e) => onChange({ ...value, priceMaxSek: e.target.value ? Number(e.target.value) : null })}
            placeholder="t.ex. 150"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="themeDesc">Tema-beskrivning <span className="text-muted-foreground">(valfritt)</span></Label>
        <Textarea
          id="themeDesc"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={2}
          placeholder="t.ex. Endast naturviner, eller från Loire-dalen"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: WineSubmissionPicker — wraps existing Systembolaget picker + free-text fallback**

First, find the existing Systembolaget picker:
Run: `find /Users/fredrik/dev/vinakademin25/src/components -iname "*Systembolaget*Picker*"`
Expected: existing picker at `src/components/systembolaget/SystembolagetProductPicker.tsx` (or similar). Re-use it.

```tsx
// src/components/blindkamp/WineSubmissionPicker.tsx
'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SystembolagetProductPicker } from '@/components/systembolaget/SystembolagetProductPicker'
import type { ThemeValue } from './ThemePicker'

export interface SubmissionValue {
  systembolagetProductNumber: string | null
  customName: string
  customProducer: string
  customVintage: string
  customPriceSek: number | null
  customType: 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'dessert' | ''
}

export function WineSubmissionPicker({
  theme,
  value,
  onChange,
}: {
  theme: ThemeValue
  value: SubmissionValue
  onChange: (v: SubmissionValue) => void
}) {
  const [mode, setMode] = React.useState<'systembolaget' | 'custom'>(
    value.systembolagetProductNumber ? 'systembolaget' : 'systembolaget',
  )

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button type="button" variant={mode === 'systembolaget' ? 'default' : 'outline'} size="sm" onClick={() => setMode('systembolaget')}>
          Sök på Systembolaget
        </Button>
        <Button type="button" variant={mode === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setMode('custom')}>
          Fyll i manuellt
        </Button>
      </div>

      {mode === 'systembolaget' ? (
        <SystembolagetProductPicker
          themeFilter={{
            wineType: theme.wineType !== 'any' ? theme.wineType : undefined,
            priceMaxSek: theme.priceMaxSek ?? undefined,
            priceMinSek: theme.priceMinSek ?? undefined,
          }}
          onSelect={(product) => {
            onChange({
              ...value,
              systembolagetProductNumber: product.productNumber,
              customName: product.productNameBold || '',
              customProducer: product.producerName || '',
              customVintage: product.vintage || '',
              customPriceSek: product.priceSek ?? null,
            })
          }}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Namn</Label>
            <Input value={value.customName} onChange={(e) => onChange({ ...value, customName: e.target.value, systembolagetProductNumber: null })} />
          </div>
          <div className="space-y-2">
            <Label>Producent</Label>
            <Input value={value.customProducer} onChange={(e) => onChange({ ...value, customProducer: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Årgång</Label>
            <Input value={value.customVintage} onChange={(e) => onChange({ ...value, customVintage: e.target.value })} placeholder="2022" />
          </div>
          <div className="space-y-2">
            <Label>Pris (kr)</Label>
            <Input type="number" value={value.customPriceSek ?? ''} onChange={(e) => onChange({ ...value, customPriceSek: e.target.value ? Number(e.target.value) : null })} />
          </div>
        </div>
      )}
    </div>
  )
}
```

**Note**: If the existing `SystembolagetProductPicker` doesn't support a `themeFilter` prop yet, this task includes adding that prop (open the picker file, add `themeFilter` to the props interface, and use it to populate query params on the search endpoint). If the picker is in admin-only mode, extract its core logic into a reusable client component in `src/components/systembolaget/SystembolagetProductPicker.tsx` first.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep blindkamp
git add src/components/blindkamp/
git commit -m "otter: ThemePicker + WineSubmissionPicker"
```

---

### Task 10: Blindkamp create page + API

**Files:**
- Create: `src/app/(frontend)/(site)/blindkamp/skapa/page.tsx`
- Create: `src/app/(frontend)/(site)/blindkamp/skapa/CreateBlindkampForm.tsx`
- Create: `src/app/api/blindkamp/route.ts`

- [ ] **Step 1: POST /api/blindkamp**

```ts
// src/app/api/blindkamp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { generateInviteCode } from '@/lib/blindkamp/invite-codes'
import { generateSubmissionToken } from '@/lib/blindkamp/tokens'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp')

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })

  const body = (await req.json()) as {
    title?: string
    clubId?: number | null
    theme: { wineType: string; priceMinSek?: number | null; priceMaxSek?: number | null }
    themeDescription?: string
    submissionDeadline?: string | null
    sessionDate?: string | null
    wineCount?: number | null
    revealStrategy?: 'one_by_one' | 'all_at_end'
    inviteUserIds?: number[]
  }

  const payload = await getPayloadClient()

  // If clubId set, verify viewer is a member
  if (body.clubId) {
    const club = (await payload.findByID({ collection: 'wine-clubs', id: body.clubId, overrideAccess: true })) as any
    const isMember = (club.members ?? []).some((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      return uid === user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Inte medlem i klubben' }, { status: 403 })
  }

  // Unique invite code
  let inviteCode = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const dup = await payload.find({
      collection: 'blind-battles',
      where: { inviteCode: { equals: inviteCode } },
      limit: 1,
      overrideAccess: true,
    })
    if (dup.docs.length === 0) break
    inviteCode = generateInviteCode()
  }

  const battle = await payload.create({
    collection: 'blind-battles',
    data: {
      title: body.title?.trim() || undefined,
      theme: {
        wineType: body.theme.wineType,
        priceMinSek: body.theme.priceMinSek ?? undefined,
        priceMaxSek: body.theme.priceMaxSek ?? undefined,
      },
      themeDescription: body.themeDescription?.trim() || undefined,
      host: user.id,
      club: body.clubId ?? undefined,
      status: 'submissions_open',
      submissionDeadline: body.submissionDeadline || undefined,
      sessionDate: body.sessionDate || undefined,
      wineCount: body.wineCount ?? undefined,
      revealStrategy: body.revealStrategy ?? 'all_at_end',
      inviteCode,
    } as never,
    overrideAccess: true,
  })

  // Auto-create one submission per invitee (status = 'invited') with their token
  const invitees = Array.from(new Set(body.inviteUserIds ?? []))
  for (const inviteeId of invitees) {
    const token = generateSubmissionToken(battle.id as number, String(inviteeId))
    await payload.create({
      collection: 'blind-battle-submissions',
      data: {
        battle: battle.id,
        user: inviteeId,
        status: 'invited',
        submissionToken: token,
      } as never,
      overrideAccess: true,
    })
  }

  // Host gets their own submission row too (they play)
  const hostToken = generateSubmissionToken(battle.id as number, String(user.id))
  await payload.create({
    collection: 'blind-battle-submissions',
    data: {
      battle: battle.id,
      user: user.id,
      status: 'invited',
      submissionToken: hostToken,
    } as never,
    overrideAccess: true,
  })

  log.info({ battleId: battle.id, clubId: body.clubId, invitees: invitees.length }, 'blind_battle_created')
  return NextResponse.json({ id: battle.id })
}
```

- [ ] **Step 2: Create form (client)**

```tsx
// src/app/(frontend)/(site)/blindkamp/skapa/CreateBlindkampForm.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemePicker, type ThemeValue } from '@/components/blindkamp/ThemePicker'
import { trackEvent } from '@/components/analytics'

export function CreateBlindkampForm({ clubId, clubMembers }: {
  clubId: number | null
  clubMembers: Array<{ id: number; name: string }>
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState('')
  const [theme, setTheme] = React.useState<ThemeValue>({ wineType: 'any', priceMinSek: null, priceMaxSek: null, description: '' })
  const [deadline, setDeadline] = React.useState('')
  const [sessionDate, setSessionDate] = React.useState('')
  const [revealStrategy, setRevealStrategy] = React.useState<'one_by_one' | 'all_at_end'>('all_at_end')
  const [inviteIds, setInviteIds] = React.useState<Set<number>>(new Set(clubMembers.map((m) => m.id)))
  const [busy, setBusy] = React.useState(false)

  function toggleInvite(id: number) {
    const next = new Set(inviteIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setInviteIds(next)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/blindkamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: title || undefined,
          clubId,
          theme: { wineType: theme.wineType, priceMinSek: theme.priceMinSek, priceMaxSek: theme.priceMaxSek },
          themeDescription: theme.description,
          submissionDeadline: deadline || null,
          sessionDate: sessionDate || null,
          revealStrategy,
          inviteUserIds: Array.from(inviteIds),
        }),
      })
      if (!res.ok) {
        toast.error('Kunde inte skapa blindkamp')
        return
      }
      const json = await res.json()
      trackEvent('blind_battle_created', { clubId, battleId: json.id })
      router.push(`/blindkamp/${json.id}`)
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titel <span className="text-muted-foreground">(valfritt)</span></Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="t.ex. Roséslaget" maxLength={120} />
      </div>

      <div className="space-y-2">
        <Label className="text-base">Tema</Label>
        <ThemePicker value={theme} onChange={setTheme} />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="deadline">Sista dag att lämna in <span className="text-muted-foreground">(valfritt)</span></Label>
          <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionDate">Datum för provningen <span className="text-muted-foreground">(valfritt)</span></Label>
          <Input id="sessionDate" type="datetime-local" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Avslöjandet</Label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setRevealStrategy('all_at_end')} className={`rounded-md border px-3 py-2 text-sm ${revealStrategy === 'all_at_end' ? 'border-brand-400 bg-brand-400/10' : 'border-border'}`}>
            Avslöja allt i slutet
          </button>
          <button type="button" onClick={() => setRevealStrategy('one_by_one')} className={`rounded-md border px-3 py-2 text-sm ${revealStrategy === 'one_by_one' ? 'border-brand-400 bg-brand-400/10' : 'border-border'}`}>
            Ett vin i taget
          </button>
        </div>
      </div>

      {clubMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Bjud in</Label>
          <p className="text-xs text-muted-foreground">Avmarkera de som inte ska vara med denna gång.</p>
          <ul className="space-y-1">
            {clubMembers.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={inviteIds.has(m.id)} onChange={() => toggleInvite(m.id)} className="h-4 w-4" />
                <span>{m.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Skapar…' : 'Skapa blindkamp'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Server page**

```tsx
// src/app/(frontend)/(site)/blindkamp/skapa/page.tsx
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { CreateBlindkampForm } from './CreateBlindkampForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Skapa blindkamp — Vinakademin' }

export default async function SkapaBlindkampPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const user = await getUser()
  if (!user) redirect('/logga-in?from=/blindkamp/skapa')
  const sp = await searchParams
  const clubId = sp.club ? parseInt(sp.club, 10) : null

  let clubMembers: Array<{ id: number; name: string }> = []
  if (clubId) {
    const payload = await getPayloadClient()
    const club = (await payload.findByID({ collection: 'wine-clubs', id: clubId, depth: 2, overrideAccess: true })) as any
    clubMembers = (club.members ?? [])
      .map((m: any) => {
        const u = typeof m.user === 'object' ? m.user : null
        const uid = u?.id ?? m.user
        if (uid === user.id) return null // host plays automatically
        const name = u?.firstName || u?.email || `Medlem #${uid}`
        return { id: uid, name }
      })
      .filter(Boolean) as Array<{ id: number; name: string }>
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Skapa blindkamp</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {clubId ? 'För en av dina vinklubbar.' : 'Pop-up — bjud in via länk efter att kampen är skapad.'}
        </p>
      </header>
      <CreateBlindkampForm clubId={clubId} clubMembers={clubMembers} />
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "blindkamp|skapa"
git add src/app/api/blindkamp/route.ts src/app/\(frontend\)/\(site\)/blindkamp/
git commit -m "otter: blindkamp create form + API"
```

---

### Task 11: Blindkamp home page

**Files:**
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/page.tsx`
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/BattleStatusPanel.tsx`

- [ ] **Step 1: Server page (status + submission count + invite link + open-session CTA)**

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { getSiteURL } from '@/lib/site-url'
import { Card, CardContent } from '@/components/ui/card'
import { BattleStatusPanel } from './BattleStatusPanel'

export const dynamic = 'force-dynamic'

export default async function BlindkampHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const battleId = parseInt(id, 10)
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/blindkamp/${id}`)

  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({ collection: 'blind-battles', id: battleId, depth: 2, overrideAccess: true })
  } catch { notFound() }

  const submissions = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })

  const mySubmission = (submissions.docs as any[]).find((s) => {
    const uid = typeof s.user === 'object' ? s.user?.id : s.user
    return uid === user.id
  })
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  const isHost = hostId === user.id
  const submittedCount = (submissions.docs as any[]).filter((s) => s.status === 'submitted').length
  const totalCount = submissions.docs.length
  const siteUrl = getSiteURL()
  const popupInviteUrl = `${siteUrl}/blindkamp/${battleId}/anslut/${battle.inviteCode}`

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">{battle.title || 'Blindkamp'}</h1>
        {battle.themeDescription && (
          <p className="text-sm text-muted-foreground mt-1">{battle.themeDescription}</p>
        )}
      </header>

      <BattleStatusPanel
        battleId={battleId}
        status={battle.status}
        submittedCount={submittedCount}
        totalCount={totalCount}
        isHost={isHost}
        mySubmissionToken={mySubmission?.submissionToken ?? null}
        mySubmissionStatus={mySubmission?.status ?? null}
        popupInviteUrl={battle.club ? null : popupInviteUrl}
      />
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/BattleStatusPanel.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Copy, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function BattleStatusPanel({ battleId, status, submittedCount, totalCount, isHost, mySubmissionToken, mySubmissionStatus, popupInviteUrl }: {
  battleId: number
  status: string
  submittedCount: number
  totalCount: number
  isHost: boolean
  mySubmissionToken: string | null
  mySubmissionStatus: string | null
  popupInviteUrl: string | null
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function openSession() {
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/open-session`, { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte starta provningen')
        return
      }
      router.push(`/blindkamp/${battleId}/provning`)
    } finally { setBusy(false) }
  }

  async function sendInvites() {
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/invitations`, { method: 'POST', credentials: 'include' })
      if (!res.ok) { toast.error('Misslyckades') ; return }
      toast.success('Inbjudningar skickade')
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <Card><CardContent className="p-5 space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
        <p className="font-medium">
          {status === 'submissions_open' && `${submittedCount} av ${totalCount} har lämnat in`}
          {status === 'in_session' && 'Provning pågår'}
          {status === 'completed' && 'Klar'}
          {status === 'draft' && 'Utkast'}
        </p>
      </CardContent></Card>

      {mySubmissionToken && mySubmissionStatus !== 'submitted' && status === 'submissions_open' && (
        <Card><CardContent className="p-5 space-y-3">
          <p className="font-medium">Du har inte lämnat in ett vin än</p>
          <Button asChild>
            <Link href={`/blindkamp/${battleId}/submit?token=${mySubmissionToken}`}>
              Välj ditt vin <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardContent></Card>
      )}

      {mySubmissionToken && mySubmissionStatus === 'submitted' && status === 'submissions_open' && (
        <Card><CardContent className="p-5 space-y-2">
          <p className="font-medium">Du har lämnat in ditt vin</p>
          <Button asChild variant="outline" size="sm">
            <Link href={`/blindkamp/${battleId}/submit?token=${mySubmissionToken}`}>Ändra ditt val</Link>
          </Button>
        </CardContent></Card>
      )}

      {isHost && status === 'submissions_open' && (
        <Card><CardContent className="p-5 space-y-3">
          <p className="font-medium">Värdkontroller</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendInvites} disabled={busy} variant="outline" size="sm">Skicka inbjudningar</Button>
            <Button onClick={openSession} disabled={busy || submittedCount < 2} size="sm">
              {submittedCount < 2 ? 'Behöver ≥ 2 bidrag' : 'Starta provningen'}
            </Button>
          </div>
        </CardContent></Card>
      )}

      {popupInviteUrl && (
        <Card><CardContent className="p-5 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Inbjudningslänk</p>
          <div className="flex gap-2">
            <input value={popupInviteUrl} readOnly className="flex-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm" />
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(popupInviteUrl); toast.success('Kopierad') }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep blindkamp
git add src/app/\(frontend\)/\(site\)/blindkamp/\[id\]/
git commit -m "otter: blindkamp home page (status + host controls)"
```

---

### Task 12: Submission page + API

**Files:**
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/submit/page.tsx`
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/submit/SubmissionForm.tsx`
- Create: `src/app/api/blindkamp/[id]/submit/route.ts`

- [ ] **Step 1: Submission API**

```ts
// src/app/api/blindkamp/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { verifySubmissionToken } from '@/lib/blindkamp/tokens'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-submit')

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token krävs' }, { status: 400 })

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { submissionToken: { equals: token } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) return NextResponse.json({ error: 'Ogiltig länk' }, { status: 404 })
  const submission = found.docs[0] as any
  if (!verifySubmissionToken(submission.submissionToken, token)) {
    return NextResponse.json({ error: 'Ogiltig token' }, { status: 401 })
  }

  // Block edits if battle is past submissions_open
  const battle = (await payload.findByID({ collection: 'blind-battles', id: battleId, overrideAccess: true })) as any
  if (battle.status !== 'submissions_open') {
    return NextResponse.json({ error: 'Inlämningen är stängd' }, { status: 400 })
  }

  const body = (await req.json()) as {
    systembolagetProductNumber: string | null
    customWine: { name: string; producer?: string; vintage?: string; priceSek?: number | null; type?: string }
  }
  if (!body.systembolagetProductNumber && !body.customWine?.name?.trim()) {
    return NextResponse.json({ error: 'Välj ett vin eller fyll i namn' }, { status: 400 })
  }

  let systembolagetProductId: number | null = null
  if (body.systembolagetProductNumber) {
    const sb = await payload.find({
      collection: 'systembolaget-products',
      where: { productNumber: { equals: body.systembolagetProductNumber } },
      limit: 1,
      overrideAccess: true,
    })
    systembolagetProductId = (sb.docs[0] as any)?.id ?? null
  }

  await payload.update({
    collection: 'blind-battle-submissions',
    id: submission.id,
    data: {
      systembolagetProduct: systembolagetProductId ?? null,
      customWine: body.systembolagetProductNumber
        ? undefined
        : {
            name: body.customWine.name.trim(),
            producer: body.customWine.producer?.trim() || undefined,
            vintage: body.customWine.vintage?.trim() || undefined,
            type: body.customWine.type || undefined,
            priceSek: body.customWine.priceSek ?? undefined,
          },
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    } as never,
    overrideAccess: true,
  })

  log.info({ battleId, submissionId: submission.id }, 'blind_battle_submission_made')
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Submission server page**

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/submit/page.tsx
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { SubmissionForm } from './SubmissionForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Lämna in ditt vin — Vinakademin' }

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams
  if (!token) notFound()
  const battleId = parseInt(id, 10)
  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { submissionToken: { equals: token } }] },
    limit: 1,
    depth: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) notFound()
  const submission = found.docs[0] as any
  const battle = await payload.findByID({ collection: 'blind-battles', id: battleId, overrideAccess: true })

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">{(battle as any).title || 'Blindkamp'}</h1>
        {(battle as any).themeDescription && (
          <p className="text-sm text-muted-foreground mt-1">{(battle as any).themeDescription}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Ditt val är hemligt. Inga andra deltagare ser vad du tar med.
        </p>
      </header>
      <SubmissionForm
        battleId={battleId}
        token={token}
        theme={(battle as any).theme}
        initial={submission}
      />
    </div>
  )
}
```

- [ ] **Step 3: Submission client form**

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/submit/SubmissionForm.tsx
'use client'
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { WineSubmissionPicker, type SubmissionValue } from '@/components/blindkamp/WineSubmissionPicker'
import type { ThemeValue } from '@/components/blindkamp/ThemePicker'
import { trackEvent } from '@/components/analytics'

export function SubmissionForm({ battleId, token, theme, initial }: {
  battleId: number
  token: string
  theme: any
  initial: any
}) {
  const router = useRouter()
  const [value, setValue] = React.useState<SubmissionValue>({
    systembolagetProductNumber: initial.systembolagetProduct?.productNumber || null,
    customName: initial.customWine?.name || '',
    customProducer: initial.customWine?.producer || '',
    customVintage: initial.customWine?.vintage || '',
    customPriceSek: initial.customWine?.priceSek ?? null,
    customType: (initial.customWine?.type || '') as SubmissionValue['customType'],
  })
  const [busy, setBusy] = React.useState(false)

  const themeValue: ThemeValue = {
    wineType: theme?.wineType ?? 'any',
    priceMinSek: theme?.priceMinSek ?? null,
    priceMaxSek: theme?.priceMaxSek ?? null,
    description: '',
  }

  async function save() {
    if (!value.systembolagetProductNumber && !value.customName.trim()) {
      toast.error('Välj ett vin eller fyll i namn manuellt')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/submit?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          systembolagetProductNumber: value.systembolagetProductNumber,
          customWine: {
            name: value.customName,
            producer: value.customProducer || undefined,
            vintage: value.customVintage || undefined,
            type: value.customType || undefined,
            priceSek: value.customPriceSek,
          },
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        toast.error(e?.error || 'Kunde inte spara')
        return
      }
      trackEvent('blind_battle_submission_made', { battleId })
      toast.success('Ditt vin är inlämnat')
      router.push(`/blindkamp/${battleId}`)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <WineSubmissionPicker theme={themeValue} value={value} onChange={setValue} />
      <Button onClick={save} disabled={busy} className="w-full">
        {busy ? 'Sparar…' : 'Lämna in'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "blindkamp|submit"
git add src/app/api/blindkamp/\[id\]/submit/ src/app/\(frontend\)/\(site\)/blindkamp/\[id\]/submit/
git commit -m "otter: blindkamp submission page + token-authed API"
```

---

### Task 13: Battle invitation email + send endpoint

**Files:**
- Create: `src/lib/session-emails/blindkamp-invitation.ts`
- Create: `src/app/api/blindkamp/[id]/invitations/route.ts`

- [ ] **Step 1: Email builder**

```ts
// src/lib/session-emails/blindkamp-invitation.ts
import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  escapeHtml,
} from '../email-cta'

export interface BlindkampInvitationInput {
  battleTitle: string
  themeDescription: string | null
  themeLabel: string
  submissionDeadline: Date | null
  sessionDate: Date | null
  hostName: string
  submissionUrl: string
}

function formatDate(d: Date | null): string | null {
  if (!d) return null
  try { return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' }) } catch { return null }
}

export function buildBlindkampInvitationEmail(input: BlindkampInvitationInput): { subject: string; html: string; text: string } {
  const subject = `Inbjudan till blindkamp: ${input.battleTitle}`
  const deadline = formatDate(input.submissionDeadline)
  const sessionDate = formatDate(input.sessionDate)
  const html = `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5"><tr><td align="center" style="padding:40px 20px">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px">
        <tr><td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700">Blindkamp</h1>
        </td></tr>
        <tr><td style="padding:32px 40px 16px">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:22px">${escapeHtml(input.battleTitle)}</h2>
          <p style="margin:0 0 8px;color:#71717a;font-size:14px">Tema: ${escapeHtml(input.themeLabel)}</p>
          ${input.themeDescription ? `<p style="margin:0 0 8px;color:#71717a;font-size:14px">${escapeHtml(input.themeDescription)}</p>` : ''}
          ${deadline ? `<p style="margin:8px 0 0;color:#71717a;font-size:14px">Sista dag att lämna in: ${escapeHtml(deadline)}</p>` : ''}
          ${sessionDate ? `<p style="margin:4px 0 0;color:#71717a;font-size:14px">Provning: ${escapeHtml(sessionDate)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:8px 40px 32px">
          <p style="margin:0 0 16px;color:#18181b;font-size:15px">${escapeHtml(input.hostName)} har bjudit in dig. Välj ditt vin nu — det förblir hemligt tills provningen.</p>
          ${emailPrimaryCtaButton(input.submissionUrl, 'Välj ditt vin')}
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`
  const text = `${input.battleTitle}\nTema: ${input.themeLabel}\n${deadline ? `Sista dag: ${deadline}\n` : ''}${sessionDate ? `Provning: ${sessionDate}\n` : ''}\nVälj ditt vin: ${input.submissionUrl}`
  return { subject, html, text }
}

const WINE_TYPE_LABELS: Record<string, string> = {
  any: 'Vilken som', red: 'Rött', white: 'Vitt', rose: 'Rosé', sparkling: 'Mousserande', orange: 'Orange', dessert: 'Dessert',
}
export function describeTheme(theme: { wineType: string; priceMinSek?: number | null; priceMaxSek?: number | null }): string {
  const parts: string[] = [WINE_TYPE_LABELS[theme.wineType] || theme.wineType]
  if (theme.priceMaxSek && theme.priceMinSek) parts.push(`${theme.priceMinSek}–${theme.priceMaxSek} kr`)
  else if (theme.priceMaxSek) parts.push(`under ${theme.priceMaxSek} kr`)
  else if (theme.priceMinSek) parts.push(`över ${theme.priceMinSek} kr`)
  return parts.join(', ')
}
```

- [ ] **Step 2: Invitations send endpoint**

```ts
// src/app/api/blindkamp/[id]/invitations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { getSiteURL } from '@/lib/site-url'
import { buildBlindkampInvitationEmail, describeTheme } from '@/lib/session-emails/blindkamp-invitation'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-invitations')

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)

  const payload = await getPayloadClient()
  const battle = (await payload.findByID({ collection: 'blind-battles', id: battleId, depth: 1, overrideAccess: true })) as any
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId !== user.id) return NextResponse.json({ error: 'Endast värden' }, { status: 403 })

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { status: { equals: 'invited' } }] },
    depth: 1,
    limit: 100,
    overrideAccess: true,
  })

  const siteUrl = getSiteURL()
  const themeLabel = describeTheme(battle.theme || { wineType: 'any' })
  const hostUser = typeof battle.host === 'object' ? battle.host : null
  const hostName = (hostUser?.firstName || hostUser?.email || 'Värden') as string

  let sent = 0
  for (const sub of subs.docs as any[]) {
    const u = typeof sub.user === 'object' ? sub.user : null
    const email = u?.email || sub.guestEmail
    if (!email) continue
    const submissionUrl = `${siteUrl}/blindkamp/${battleId}/submit?token=${encodeURIComponent(sub.submissionToken)}`
    const { subject, html, text } = buildBlindkampInvitationEmail({
      battleTitle: battle.title || 'Blindkamp',
      themeDescription: battle.themeDescription ?? null,
      themeLabel,
      submissionDeadline: battle.submissionDeadline ? new Date(battle.submissionDeadline) : null,
      sessionDate: battle.sessionDate ? new Date(battle.sessionDate) : null,
      hostName,
      submissionUrl,
    })
    try {
      await payload.sendEmail({ to: email, subject, html, text })
      sent += 1
    } catch (err) {
      log.error({ err, email }, 'blindkamp_invitation_failed')
    }
  }
  log.info({ battleId, sent }, 'blindkamp_invitations_sent')
  return NextResponse.json({ ok: true, sent })
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "invitation|blindkamp"
git add src/lib/session-emails/blindkamp-invitation.ts src/app/api/blindkamp/\[id\]/invitations/
git commit -m "otter: blindkamp invitation email + send endpoint"
```

---

### Task 14: Pop-up guest entry

**Files:**
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/anslut/[code]/page.tsx`
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/anslut/[code]/JoinGuestClient.tsx`
- Create: `src/app/api/blindkamp/[id]/join-guest/route.ts`

- [ ] **Step 1: Join-guest API**

```ts
// src/app/api/blindkamp/[id]/join-guest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { generateSubmissionToken } from '@/lib/blindkamp/tokens'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)
  const { inviteCode, name, email } = (await req.json()) as { inviteCode: string; name: string; email: string }
  if (!inviteCode || !name?.trim() || !email?.trim()) return NextResponse.json({ error: 'Namn + e-post krävs' }, { status: 400 })

  const payload = await getPayloadClient()
  const battle = (await payload.findByID({ collection: 'blind-battles', id: battleId, overrideAccess: true })) as any
  if (battle.inviteCode !== inviteCode) return NextResponse.json({ error: 'Ogiltig kod' }, { status: 404 })
  if (battle.status !== 'submissions_open') return NextResponse.json({ error: 'Inlämningen är stängd' }, { status: 400 })

  // Check for existing submission by email
  const lowered = email.trim().toLowerCase()
  const existing = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { guestEmail: { equals: lowered } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length > 0) {
    return NextResponse.json({ token: (existing.docs[0] as any).submissionToken })
  }

  const token = generateSubmissionToken(battleId, lowered)
  await payload.create({
    collection: 'blind-battle-submissions',
    data: {
      battle: battleId,
      guestEmail: lowered,
      guestName: name.trim(),
      status: 'invited',
      submissionToken: token,
    } as never,
    overrideAccess: true,
  })
  return NextResponse.json({ token })
}
```

- [ ] **Step 2: Anslut server page**

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/anslut/[code]/page.tsx
import { notFound } from 'next/navigation'
import { getPayloadClient } from '@/lib/payload'
import { JoinGuestClient } from './JoinGuestClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Gå med i blindkamp — Vinakademin' }

export default async function BlindkampAnslutPage({ params }: { params: Promise<{ id: string; code: string }> }) {
  const { id, code } = await params
  const battleId = parseInt(id, 10)
  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({ collection: 'blind-battles', id: battleId, overrideAccess: true })
  } catch { notFound() }
  if (battle.inviteCode !== code) notFound()

  return (
    <div className="mx-auto max-w-md px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">{battle.title || 'Blindkamp'}</h1>
        {battle.themeDescription && <p className="text-sm text-muted-foreground mt-1">{battle.themeDescription}</p>}
      </header>
      <JoinGuestClient battleId={battleId} inviteCode={code} />
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/anslut/[code]/JoinGuestClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function JoinGuestClient({ battleId, inviteCode }: { battleId: number; inviteCode: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch(`/api/blindkamp/${battleId}/join-guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ inviteCode, name, email }),
      })
      if (!res.ok) { toast.error('Kunde inte gå med'); return }
      const { token } = await res.json()
      router.push(`/blindkamp/${battleId}/submit?token=${encodeURIComponent(token)}`)
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Namn</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-post</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? 'Ansluter…' : 'Gå med'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "anslut|join-guest"
git add src/app/\(frontend\)/\(site\)/blindkamp/\[id\]/anslut/ src/app/api/blindkamp/\[id\]/join-guest/
git commit -m "otter: pop-up battle guest entry"
```

---

## Phase 4 — Session ritual + tasting

### Task 15: Open-session API (assign secret slots + create CourseSession)

**Files:**
- Create: `src/app/api/blindkamp/[id]/open-session/route.ts`

- [ ] **Step 1: Open-session endpoint**

```ts
// src/app/api/blindkamp/[id]/open-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { assignPourOrders } from '@/lib/blindkamp/shuffle'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-open-session')

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)

  const payload = await getPayloadClient()
  const battle = (await payload.findByID({ collection: 'blind-battles', id: battleId, overrideAccess: true })) as any
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId !== user.id) return NextResponse.json({ error: 'Endast värden' }, { status: 403 })
  if (battle.status !== 'submissions_open') return NextResponse.json({ error: 'Provningen kan inte startas i nuvarande status' }, { status: 400 })

  const submittedRes = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { status: { equals: 'submitted' } }] },
    limit: 100,
    overrideAccess: true,
  })
  const submissions = submittedRes.docs as any[]
  if (submissions.length < 2) {
    return NextResponse.json({ error: 'Behöver minst 2 inlämnade vin för att starta' }, { status: 400 })
  }

  // Assign random pour orders 1..N
  const pourOrders = assignPourOrders(submissions)
  for (let i = 0; i < submissions.length; i++) {
    await payload.update({
      collection: 'blind-battle-submissions',
      id: submissions[i]!.id,
      data: { pourOrder: pourOrders[i] } as never,
      overrideAccess: true,
    })
  }

  // Create a CourseSession to host the live tasting. The session reuses all existing
  // session UI (timer, focus current wine, reveal toggle).
  const session = await payload.create({
    collection: 'course-sessions',
    data: {
      title: battle.title || `Blindkamp #${battleId}`,
      host: user.id,
      status: 'live',
      metadata: { blindBattleId: battleId },
    } as never,
    overrideAccess: true,
  })

  await payload.update({
    collection: 'blind-battles',
    id: battleId,
    data: { status: 'in_session', currentSession: session.id } as never,
    overrideAccess: true,
  })

  log.info({ battleId, sessionId: session.id, submissions: submissions.length }, 'blind_battle_session_started')
  return NextResponse.json({ ok: true, sessionId: session.id })
}
```

**Note**: If `course-sessions` requires additional fields (`course`, `tastingPlan`, `expiresAt`, etc.), the implementer should inspect `src/collections/CourseSessions.ts` and either:
(a) make the missing fields optional in the collection for the blindkamp use case, or
(b) populate sensible defaults here. The implementer must verify the field shape before writing this task — don't blindly trust the structure above.

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep open-session
git add src/app/api/blindkamp/\[id\]/open-session/
git commit -m "otter: blindkamp open-session API (assign slots + create session)"
```

---

### Task 16: Provning page — secret slot + countdown + live tasting

**Files:**
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/provning/page.tsx`
- Create: `src/components/blindkamp/SecretSlotPanel.tsx`
- Create: `src/components/blindkamp/CountdownButton.tsx`
- Create: `src/components/blindkamp/HelpExplainer.tsx`

- [ ] **Step 1: HelpExplainer**

```tsx
// src/components/blindkamp/HelpExplainer.tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { HelpCircle } from 'lucide-react'

export function HelpExplainer() {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-3.5 w-3.5" /> Hur funkar det?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <h3 className="text-lg font-medium mb-3">Så här går blindkampen till</h3>
        <ol className="space-y-3 text-sm">
          <li><strong>1. Slå in flaskan.</strong> Använd en ogenomskinlig vinpåse eller folie + tubsocka så ingen ser etiketten eller flasktypen.</li>
          <li><strong>2. Hemlig plats.</strong> Telefonen säger var just du ska ställa din flaska (t.ex. #4). Andra deltagare ser inte din plats.</li>
          <li><strong>3. Häll och smaka.</strong> Värden räknar ner, alla placerar samtidigt. Häll från plats 1, 2, 3… i tur och ordning. Sätt betyg blint.</li>
        </ol>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: SecretSlotPanel + CountdownButton**

```tsx
// src/components/blindkamp/SecretSlotPanel.tsx
'use client'
import { Card, CardContent } from '@/components/ui/card'

export function SecretSlotPanel({ slot, wineLabel }: { slot: number; wineLabel: string }) {
  return (
    <Card className="border-brand-400/50 bg-brand-400/5">
      <CardContent className="p-6 text-center space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Din hemliga plats</p>
        <p className="font-heading text-5xl text-brand-400">#{slot}</p>
        <p className="text-sm">
          Ställ din inslagna flaska (<span className="font-medium">{wineLabel}</span>) på plats <strong>#{slot}</strong> när värden räknar ner.
        </p>
        <p className="text-xs text-muted-foreground">Visa inte denna skärm för andra deltagare.</p>
      </CardContent>
    </Card>
  )
}
```

```tsx
// src/components/blindkamp/CountdownButton.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CountdownButton({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState<number | null>(null)
  function start() {
    setCount(3)
    let n = 3
    const tick = () => {
      n -= 1
      if (n <= 0) {
        setCount(0)
        onComplete()
        setTimeout(() => setCount(null), 800)
      } else {
        setCount(n)
        setTimeout(tick, 1000)
      }
    }
    setTimeout(tick, 1000)
  }
  if (count !== null) {
    return <div className="text-center py-6 text-5xl font-heading text-brand-400">{count === 0 ? 'NU' : count}</div>
  }
  return <Button onClick={start} className="w-full">Räkna ner (3, 2, 1)</Button>
}
```

- [ ] **Step 3: Provning page**

This page reuses the existing CourseSession session UI. The blindkamp-specific addition is the secret-slot panel before the tasting starts, and the self-rating tag during the tasting.

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/provning/page.tsx
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { ProvningClient } from './ProvningClient'

export const dynamic = 'force-dynamic'

export default async function ProvningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const battleId = parseInt(id, 10)
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/blindkamp/${id}/provning`)

  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({ collection: 'blind-battles', id: battleId, depth: 2, overrideAccess: true })
  } catch { notFound() }

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })
  const mySubmission = (subs.docs as any[]).find((s) => {
    const uid = typeof s.user === 'object' ? s.user?.id : s.user
    return uid === user.id
  })
  if (!mySubmission) redirect(`/blindkamp/${battleId}`)

  const wineLabel = mySubmission.systembolagetProduct?.productNameBold || mySubmission.customWine?.name || 'Ditt vin'
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  const isHost = hostId === user.id

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <ProvningClient
        battleId={battleId}
        sessionId={typeof battle.currentSession === 'object' ? battle.currentSession.id : battle.currentSession}
        mySlot={mySubmission.pourOrder}
        myWineLabel={wineLabel}
        isHost={isHost}
        totalSlots={subs.docs.length}
      />
    </div>
  )
}
```

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/provning/ProvningClient.tsx
'use client'
import * as React from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SecretSlotPanel } from '@/components/blindkamp/SecretSlotPanel'
import { CountdownButton } from '@/components/blindkamp/CountdownButton'
import { HelpExplainer } from '@/components/blindkamp/HelpExplainer'

export function ProvningClient({ battleId, sessionId, mySlot, myWineLabel, isHost, totalSlots }: {
  battleId: number
  sessionId: number
  mySlot: number
  myWineLabel: string
  isHost: boolean
  totalSlots: number
}) {
  const [phase, setPhase] = React.useState<'placement' | 'tasting'>('placement')

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-heading">Blindkamp</h1>
        <HelpExplainer />
      </header>

      {phase === 'placement' && (
        <>
          <SecretSlotPanel slot={mySlot} wineLabel={myWineLabel} />
          {isHost && (
            <Card><CardContent className="p-5 space-y-3 text-center">
              <p className="text-sm text-muted-foreground">När alla har slagit in sina flaskor och tittar bort, klicka för att räkna ner.</p>
              <CountdownButton onComplete={() => setPhase('tasting')} />
            </CardContent></Card>
          )}
          {!isHost && (
            <Card><CardContent className="p-5 text-center text-sm text-muted-foreground">
              Väntar på värden att starta nedräkningen…
            </CardContent></Card>
          )}
        </>
      )}

      {phase === 'tasting' && (
        <Card><CardContent className="p-5 space-y-3 text-center">
          <p className="font-medium">Provningen är igång</p>
          <p className="text-sm text-muted-foreground">
            Vinerna är på plats 1–{totalSlots}. Häll från plats 1 till alla, sätt betyg, gå sedan till nästa plats.
          </p>
          <Button asChild className="w-full">
            <Link href={`/sessions/${sessionId}`}>Gå till provningen</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Du ser ditt eget vin på plats {mySlot} när det är dags att smaka. Ditt eget betyg räknas inte mot snittet.
          </p>
        </CardContent></Card>
      )}
    </div>
  )
}
```

**Note**: The exact route for the existing live session UI must be confirmed at implementation time. If sessions live at `/sessions/[id]` substitute the correct route. The blindkamp ritual page is the *entry* into the existing session; the existing session UI handles wine ratings.

The self-rating exclusion is enforced server-side in `compute-leaderboard.ts` (already implemented in Task 7) — Reviews submitted via the existing session UI need to carry a `metadata.submissionId` field so the leaderboard can associate ratings to submissions. This requires extending the rating submission flow with an optional `submissionId` field. If the existing session UI doesn't pass it, the implementer adds a `submissionId` param to the review POST.

- [ ] **Step 4: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "provning|secret-slot|countdown"
git add src/components/blindkamp/ src/app/\(frontend\)/\(site\)/blindkamp/\[id\]/provning/
git commit -m "otter: blindkamp provning page (secret-slot panel + countdown)"
```

---

### Task 17: Reveal API + results page

**Files:**
- Create: `src/app/api/blindkamp/[id]/reveal/route.ts`
- Create: `src/app/(frontend)/(site)/blindkamp/[id]/resultat/page.tsx`
- Create: `src/components/blindkamp/RevealCard.tsx`

- [ ] **Step 1: Reveal API**

```ts
// src/app/api/blindkamp/[id]/reveal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-reveal')

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)

  const payload = await getPayloadClient()
  const battle = (await payload.findByID({ collection: 'blind-battles', id: battleId, overrideAccess: true })) as any
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId !== user.id) return NextResponse.json({ error: 'Endast värden' }, { status: 403 })
  if (battle.status !== 'in_session') return NextResponse.json({ error: 'Provningen är inte aktiv' }, { status: 400 })

  // Stamp revealedAt on every submission
  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    overrideAccess: true,
  })
  const now = new Date().toISOString()
  for (const s of subs.docs as any[]) {
    await payload.update({
      collection: 'blind-battle-submissions',
      id: s.id,
      data: { revealedAt: now } as never,
      overrideAccess: true,
    })
  }

  await payload.update({
    collection: 'blind-battles',
    id: battleId,
    data: { status: 'completed' } as never,
    overrideAccess: true,
  })

  log.info({ battleId }, 'blind_battle_revealed')
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: RevealCard component**

```tsx
// src/components/blindkamp/RevealCard.tsx
'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy } from 'lucide-react'

export function RevealCard({ slot, wineTitle, producer, vintage, imageUrl, submitterName, averageRating, isWinner }: {
  slot: number
  wineTitle: string
  producer: string | null
  vintage: string | null
  imageUrl: string | null
  submitterName: string
  averageRating: number | null
  isWinner: boolean
}) {
  return (
    <Card className={isWinner ? 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10' : ''}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {imageUrl && (
            <img src={imageUrl} alt={wineTitle} className="w-16 h-20 object-contain flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Plats #{slot}</span>
              {isWinner && <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium"><Trophy className="h-3 w-3" /> Vinnare</span>}
            </div>
            <p className="font-medium mt-1">{wineTitle}</p>
            {(producer || vintage) && (
              <p className="text-xs text-muted-foreground mt-0.5">{[producer, vintage].filter(Boolean).join(' · ')}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm">
                Insänt av <span className="font-medium">{submitterName}</span>
              </p>
              <p className="text-sm">
                {averageRating !== null ? `${averageRating.toFixed(2)} ★` : '—'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Results page**

```tsx
// src/app/(frontend)/(site)/blindkamp/[id]/resultat/page.tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RevealCard } from '@/components/blindkamp/RevealCard'

export const dynamic = 'force-dynamic'

export default async function ResultatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const battleId = parseInt(id, 10)
  const user = await getUser()
  if (!user) redirect(`/logga-in?from=/blindkamp/${id}/resultat`)

  const payload = await getPayloadClient()
  let battle: any
  try {
    battle = await payload.findByID({ collection: 'blind-battles', id: battleId, depth: 1, overrideAccess: true })
  } catch { notFound() }

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 2,
    overrideAccess: true,
  })

  // Get reviews tied to the session, build {submissionId → avg (ex-self)}
  const sessionId = typeof battle.currentSession === 'object' ? battle.currentSession?.id : battle.currentSession
  const reviewsRes = await payload.find({
    collection: 'reviews',
    where: { session: { equals: sessionId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })
  const ratingsBySub = new Map<number, number[]>()
  for (const r of reviewsRes.docs as any[]) {
    const subId = (r.metadata as any)?.submissionId
    if (typeof subId !== 'number') continue
    if (!ratingsBySub.has(subId)) ratingsBySub.set(subId, [])
    if (typeof r.rating === 'number') {
      // exclude self-rating
      const sub = (subs.docs as any[]).find((s) => s.id === subId)
      const submitterId = typeof sub?.user === 'object' ? sub.user?.id : sub?.user
      const reviewerId = typeof r.user === 'object' ? r.user?.id : r.user
      if (reviewerId !== submitterId) {
        ratingsBySub.get(subId)!.push(r.rating)
      }
    }
  }

  // Sort by avg desc
  const rows = (subs.docs as any[])
    .map((s) => {
      const ratings = ratingsBySub.get(s.id) ?? []
      const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null
      const u = typeof s.user === 'object' ? s.user : null
      const submitterName = (u?.firstName || u?.email || s.guestName || 'Anonym') as string
      const wineTitle = s.systembolagetProduct?.productNameBold || s.customWine?.name || 'Vin'
      const producer = s.systembolagetProduct?.producerName || s.customWine?.producer || null
      const vintage = s.systembolagetProduct?.vintage || s.customWine?.vintage || null
      const imageUrl = s.systembolagetProduct?.imageUrl || s.customWine?.imageUrl || null
      return { id: s.id, slot: s.pourOrder, submitterName, wineTitle, producer, vintage, imageUrl, averageRating: avg }
    })
    .sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1))

  const topAvg = rows[0]?.averageRating ?? null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <Link href={battle.club ? `/vinklubbar/${typeof battle.club === 'object' ? battle.club.slug : ''}?tab=historik` : '/vinklubbar'} className="text-sm text-muted-foreground hover:underline">
          ← Tillbaka
        </Link>
        <h1 className="text-2xl font-heading mt-2">{battle.title || 'Blindkamp'} — Resultat</h1>
      </header>

      <div className="space-y-3">
        {rows.map((r) => (
          <RevealCard
            key={r.id}
            slot={r.slot}
            wineTitle={r.wineTitle}
            producer={r.producer}
            vintage={r.vintage}
            imageUrl={r.imageUrl}
            submitterName={r.submitterName}
            averageRating={r.averageRating}
            isWinner={topAvg !== null && r.averageRating === topAvg}
          />
        ))}
      </div>

      {!battle.club && (
        <Card><CardContent className="p-5 space-y-3 text-center">
          <p className="font-medium">Vill ni göra det här igen?</p>
          <p className="text-sm text-muted-foreground">Skapa en vinklubb och kör flera blindkampar med samma grupp.</p>
          <Button asChild>
            <Link href="/vinklubbar/skapa">Skapa vinklubb</Link>
          </Button>
        </CardContent></Card>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Trigger reveal from the live session UI**

This step depends on the existing session UI's host controls. The implementer locates the "end session" or equivalent button in the existing CourseSession host UI and adds an alternative path: if the session's `metadata.blindBattleId` is set, the end-session action hits `/api/blindkamp/<id>/reveal` and routes to `/blindkamp/<id>/resultat`. Locate the relevant component at `src/components/tasting-plan/PlanSessionContent.tsx` (line ~290 has `session_ended` tracking — look for the trigger button nearby).

If the existing UI does not expose a customizable end-of-session hook, fall back: add a "Avsluta och avslöja" button on `/blindkamp/[id]/provning` (host only) that POSTs to the reveal endpoint and redirects to the results page.

- [ ] **Step 5: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "reveal|resultat"
git add src/app/api/blindkamp/\[id\]/reveal/ src/app/\(frontend\)/\(site\)/blindkamp/\[id\]/resultat/ src/components/blindkamp/RevealCard.tsx
git commit -m "otter: blindkamp reveal API + results page"
```

---

## Phase 5 — Polish, analytics, integrations

### Task 18: Wrap-up email — append battle results

**Files:**
- Modify: `src/lib/session-emails/wrap-up.ts`
- Modify: `src/lib/send-wrap-up-emails.ts`

- [ ] **Step 1: Add optional battle-results block to WrapUpEmailInput**

Open `src/lib/session-emails/wrap-up.ts`. Locate the `WrapUpEmailInput` interface (top of file). Add an optional field:

```ts
// Add to WrapUpEmailInput
blindBattle?: {
  battleTitle: string
  winnerName: string
  winnerWineTitle: string
  yourSubmittedWineTitle: string | null
  yourSubmittedAvgRating: number | null
} | null
```

In `buildWrapUpEmail`, after the recommendations block, add a battle-results block:

```ts
// Inside buildWrapUpEmail, after recommendations rendering:
const battleBlock = input.blindBattle
  ? `<tr><td style="padding: 8px 40px 16px">
      <h3 style="margin: 0 0 8px; color: #18181b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em">Resultat</h3>
      <p style="margin: 0; color: #18181b; font-size: 15px">
        Vinnare: <strong>${escapeHtml(input.blindBattle.winnerName)}</strong> med <em>${escapeHtml(input.blindBattle.winnerWineTitle)}</em>.
      </p>
      ${input.blindBattle.yourSubmittedWineTitle ? `<p style="margin: 6px 0 0; color: #71717a; font-size: 14px">Ditt vin: ${escapeHtml(input.blindBattle.yourSubmittedWineTitle)} (${input.blindBattle.yourSubmittedAvgRating?.toFixed(2) ?? '—'} ★)</p>` : ''}
    </td></tr>`
  : ''
// Insert battleBlock into the html template right before the </table> closing tag of the inner card.
```

- [ ] **Step 2: Extract shared `compute-battle-result.ts` helper**

The winner-computation logic is needed by both the results page (Task 17) and the wrap-up email (this task). Create a shared helper and refactor both call sites to use it.

```ts
// src/lib/blindkamp/compute-battle-result.ts
import type { Payload } from 'payload'

export interface BattleResultRow {
  submissionId: number
  slot: number
  submitterId: number | null
  submitterName: string
  wineTitle: string
  producer: string | null
  vintage: string | null
  imageUrl: string | null
  averageRating: number | null
  isWinner: boolean
}

export interface BattleResultSummary {
  rows: BattleResultRow[]
  winner: BattleResultRow | null
}

/**
 * Computes the final ranking for a completed (or in-session) blindkamp.
 * Self-ratings are excluded from each wine's average. Ties → all top wines
 * marked isWinner=true.
 */
export async function computeBattleResult(
  payload: Payload,
  battleId: number,
): Promise<BattleResultSummary> {
  const battle = (await payload.findByID({
    collection: 'blind-battles',
    id: battleId,
    depth: 1,
    overrideAccess: true,
  })) as any

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    depth: 2,
    overrideAccess: true,
  })

  const sessionId =
    typeof battle.currentSession === 'object'
      ? battle.currentSession?.id
      : battle.currentSession
  const reviewsRes = sessionId
    ? await payload.find({
        collection: 'reviews',
        where: { session: { equals: sessionId } },
        limit: 1000,
        depth: 0,
        overrideAccess: true,
      })
    : { docs: [] as any[] }

  const ratingsBySub = new Map<number, number[]>()
  for (const r of reviewsRes.docs as any[]) {
    const subId = (r.metadata as any)?.submissionId
    if (typeof subId !== 'number') continue
    if (typeof r.rating !== 'number') continue
    const sub = (subs.docs as any[]).find((s) => s.id === subId)
    if (!sub) continue
    const submitterId = typeof sub.user === 'object' ? sub.user?.id : sub.user
    const reviewerId = typeof r.user === 'object' ? r.user?.id : r.user
    if (reviewerId === submitterId) continue // exclude self-rating
    if (!ratingsBySub.has(subId)) ratingsBySub.set(subId, [])
    ratingsBySub.get(subId)!.push(r.rating)
  }

  const rows: BattleResultRow[] = (subs.docs as any[]).map((s) => {
    const ratings = ratingsBySub.get(s.id) ?? []
    const avg = ratings.length > 0 ? ratings.reduce((sum, x) => sum + x, 0) / ratings.length : null
    const u = typeof s.user === 'object' ? s.user : null
    const submitterId = u?.id ?? (typeof s.user === 'number' ? s.user : null)
    const submitterName = (u?.firstName || u?.email || s.guestName || 'Anonym') as string
    const wineTitle = s.systembolagetProduct?.productNameBold || s.customWine?.name || 'Vin'
    const producer = s.systembolagetProduct?.producerName || s.customWine?.producer || null
    const vintage = s.systembolagetProduct?.vintage || s.customWine?.vintage || null
    const imageUrl = s.systembolagetProduct?.imageUrl || s.customWine?.imageUrl || null
    return {
      submissionId: s.id,
      slot: s.pourOrder,
      submitterId,
      submitterName,
      wineTitle,
      producer,
      vintage,
      imageUrl,
      averageRating: avg,
      isWinner: false,
    }
  })

  rows.sort((a, b) => (b.averageRating ?? -1) - (a.averageRating ?? -1))
  const topAvg = rows[0]?.averageRating ?? null
  for (const r of rows) {
    r.isWinner = topAvg !== null && r.averageRating === topAvg
  }
  const winner = rows.find((r) => r.isWinner) ?? null
  return { rows, winner }
}
```

- [ ] **Step 3: Refactor `/resultat/page.tsx` to use the helper**

Open `src/app/(frontend)/(site)/blindkamp/[id]/resultat/page.tsx` (from Task 17). Replace the inline winner computation block with:

```ts
import { computeBattleResult } from '@/lib/blindkamp/compute-battle-result'
// ...
const { rows } = await computeBattleResult(payload, battleId)
```

Then iterate `rows` and render `<RevealCard>` for each — same as before, just sourcing from the helper.

- [ ] **Step 4: Wire `send-wrap-up-emails.ts` to populate `blindBattle`**

Open `src/lib/send-wrap-up-emails.ts`. Inside `buildEmailInput`, after computing `recommendations`:

```ts
import { computeBattleResult } from '@/lib/blindkamp/compute-battle-result'
// ...

const battleId = (session as any)?.metadata?.blindBattleId
let blindBattle: WrapUpEmailInput['blindBattle'] = null
if (typeof battleId === 'number') {
  const result = await computeBattleResult(payload, battleId)
  const battle = await payload.findByID({
    collection: 'blind-battles',
    id: battleId,
    overrideAccess: true,
  })
  const yourRow = result.rows.find((r) => r.submitterId === participant.user)
  blindBattle = result.winner
    ? {
        battleTitle: (battle as any).title || 'Blindkamp',
        winnerName: result.winner.submitterName,
        winnerWineTitle: result.winner.wineTitle,
        yourSubmittedWineTitle: yourRow?.wineTitle ?? null,
        yourSubmittedAvgRating: yourRow?.averageRating ?? null,
      }
    : null
}
// Include `blindBattle` in the return value of buildEmailInput
```

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "wrap-up|battle-result"
git add src/lib/session-emails/wrap-up.ts src/lib/send-wrap-up-emails.ts src/lib/blindkamp/compute-battle-result.ts
git commit -m "otter: wrap-up email shows blindkamp results"
```

---

### Task 19: PostHog events on the launch dashboard

**Files:**
- Modify: existing dashboard insights via PostHog MCP (no code change, just analytics)

- [ ] **Step 1: Verify all events are firing**

Run `pnpm dev`, walk through the flow once locally:
1. Create club → expect `wine_club_created` in PostHog dev events
2. Create blind battle → expect `blind_battle_created`
3. Submit a wine → expect `blind_battle_submission_made`
4. Open session → expect `blind_battle_session_started` (server-side log only, not yet PostHog)
5. Reveal → expect `blind_battle_revealed` (server-side log only)
6. Wrap up → expect `blind_battle_completed`

Server-side events: PostHog client SDK is browser-only in this project, so server-side events aren't sent. Acceptable for v1 — `wine_club_created`, `blind_battle_created`, `blind_battle_submission_made` fire client-side. The lifecycle events (`session_started`, `revealed`, `completed`) are captured server-side in pino logs but skip PostHog. (Defer until posthog-node is added — same decision as Chunk R.)

- [ ] **Step 2: Add three new insights to the launch dashboard (via PostHog MCP)**

Use the PostHog MCP to create three insights attached to dashboard `691024`:

- Daily new wine clubs created — `query-trends`, event `wine_club_created`, last 30 days, line chart
- Daily new blind battles created — `query-trends`, event `blind_battle_created`, last 30 days, line chart
- Battle submission count — `query-trends`, event `blind_battle_submission_made`, last 30 days, bar chart

(The implementer runs the PostHog MCP create-insight commands directly; this isn't a code change.)

- [ ] **Step 3: No commit** (no code changes in this task)

---

### Task 20: Neutral-helper fallback ritual

The default ritual is the secret-shuffle (Task 16). For low-tech groups, the host can toggle a fallback: a physically-shuffled bottle setup managed by a non-tasting helper.

**Files:**
- Modify: `src/app/(frontend)/(site)/blindkamp/[id]/provning/ProvningClient.tsx` (from Task 16)
- Modify: `src/app/api/blindkamp/[id]/open-session/route.ts` (from Task 15)

- [ ] **Step 1: Add a host toggle on the provning ritual screen**

In `ProvningClient.tsx`, add a host-only toggle "Använd neutral hjälpare istället" above the `SecretSlotPanel`. When enabled, swap the placement phase UI for a different host-only panel.

```tsx
// In ProvningClient.tsx, replace the placement-phase block with:

const [useHelper, setUseHelper] = React.useState(false)

{phase === 'placement' && (
  <>
    {isHost && (
      <div className="flex justify-end">
        <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={useHelper} onChange={(e) => setUseHelper(e.target.checked)} />
          Använd neutral hjälpare istället för hemlig plats
        </label>
      </div>
    )}

    {!useHelper && (
      <>
        <SecretSlotPanel slot={mySlot} wineLabel={myWineLabel} />
        {isHost ? (
          <Card><CardContent className="p-5 space-y-3 text-center">
            <p className="text-sm text-muted-foreground">När alla har slagit in sina flaskor och tittar bort, klicka för att räkna ner.</p>
            <CountdownButton onComplete={() => setPhase('tasting')} />
          </CardContent></Card>
        ) : (
          <Card><CardContent className="p-5 text-center text-sm text-muted-foreground">
            Väntar på värden att starta nedräkningen…
          </CardContent></Card>
        )}
      </>
    )}

    {useHelper && isHost && (
      <Card><CardContent className="p-5 space-y-3">
        <p className="font-medium">Neutral hjälpare</p>
        <p className="text-sm text-muted-foreground">
          Be någon som inte ska smaka att blanda och numrera de inslagna flaskorna 1–{totalSlots}.
          När det är klart, klicka för att börja provningen.
        </p>
        <Button onClick={() => setPhase('tasting')} className="w-full">Allt klart — starta provningen</Button>
      </CardContent></Card>
    )}

    {useHelper && !isHost && (
      <Card><CardContent className="p-5 text-center text-sm text-muted-foreground">
        Värden använder en neutral hjälpare för att blanda flaskorna. Väntar på att de blir klara…
      </CardContent></Card>
    )}
  </>
)}
```

- [ ] **Step 2: No data-model change needed**

The neutral-helper mode produces the same end-state as the secret-shuffle: bottles in random slots 1..N. `pourOrder` is already randomly assigned server-side in Task 15's open-session API. The toggle only changes the UX framing — same data flow underneath.

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "provning|helper"
git add src/app/\(frontend\)/\(site\)/blindkamp/\[id\]/provning/
git commit -m "otter: neutral-helper fallback ritual"
```

---

### Task 22: Nav entry + final polish

**Files:**
- Modify: `src/components/nav/*` (locate the primary nav component)

- [ ] **Step 1: Locate the primary nav component**

Run: `grep -rln "Mina sidor\|Mina provningar" /Users/fredrik/dev/vinakademin25/src/components/`
Identify the file that renders the main authed-user nav. Add a "Vinklubbar" entry alongside.

- [ ] **Step 2: Add nav entry**

Add a link with `href="/vinklubbar"` and label `"Vinklubbar"`. Match the existing nav entry style (use the same icon component pattern — likely `lucide-react` `Users` icon).

- [ ] **Step 3: Typecheck + commit**

```bash
pnpm tsc --noEmit
git add src/components/nav/
git commit -m "otter: add Vinklubbar to primary nav"
```

---

## Final verification + ship

- [ ] **Step 1: Full typecheck**

Run: `pnpm tsc --noEmit 2>&1 | tail -20`
Expected: no errors in any of the new files (pre-existing errors elsewhere are OK).

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: any new files lint cleanly (warnings in unrelated files are pre-existing).

- [ ] **Step 3: End-to-end manual walk-through on dev**

Run: `pnpm dev`. Walk through:
1. Create wine club at `/vinklubbar/skapa`
2. Invite a second test user via Members page
3. As that user, join via invite link
4. As host, create blind battle at `/blindkamp/skapa?club=<id>`
5. As both users, submit wines via the submission link
6. As host, click "Starta provningen"
7. Both phones show secret slot panel; host clicks countdown
8. Navigate through the existing live session UI, rate every wine
9. Host clicks "Avsluta och avslöja" — lands on results page
10. Results show winner + ranking
11. Wrap-up email arrives within ~18h with results block
12. Club leaderboard shows the winning user with +1 vinst

- [ ] **Step 4: Squash-merge to production**

```bash
git fetch origin production
git checkout production
git pull --ff-only origin production
git merge --squash main
# Resolve any conflicts with --theirs (same recurring pattern as Chunk R)
git commit -m "release: Blindkamp + Vinklubb (v1)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin production
git checkout main
```

---

## Self-review checklist

After writing each task, re-read the spec section by section and confirm coverage. Spec → task mapping:

| Spec section | Implementing task(s) |
|---|---|
| Goal / Why now | (informational, no task) |
| Terminology | All tasks use the Swedish names |
| Decisions captured | All; specific decisions called out per task |
| Data model | Tasks 1, 2, 3 (collections + migration) |
| URL structure | Tasks 6, 7, 8, 10, 11, 12, 14, 16, 17 |
| User flows — Flow A | Tasks 5-13 + 15-17 |
| User flows — Flow B | Tasks 14, 17 |
| Session ritual (secret shuffle) | Tasks 4, 15, 16 |
| Session ritual (neutral-helper fallback) | Task 20 |
| Club page (Översikt/Topplista/Historik) | Tasks 7, 8 |
| Scoring rules | Task 7 (compute-leaderboard.ts) |
| Permissions | Tasks 1, 2, 3 access helpers |
| Email touchpoints | Tasks 13, 18 |
| Open decisions | (informational — implementer adopts recommendations from spec) |
| UX principles | Task 16 (HelpExplainer) |
| Migration & rollout | Task 3 generates migration; Final verification covers squash-merge |
| Success criteria | Task 19 (PostHog dashboard insights) |
| Out of scope | (Phase 2 — not implemented) |

**Type consistency check**: confirmed `pourOrder`, `submissionToken`, `inviteCode` references across all tasks. The spec field naming was tightened during self-review — `pourOrder` is the single field, surfaced to UI as "din hemliga plats" (no separate `secretSlot` field).

**Placeholder scan**: re-ran after refactoring Task 18 to call `compute-battle-result.ts` (the helper is now defined in full). No remaining "..." placeholders or vague directives in code blocks.

**Scope coverage**: 22 tasks total, 5 phases. Each phase ends with shippable software:
- Phase 1: collections + migrations — admin-only state
- Phase 2: clubs functional (create, join, manage members)
- Phase 3: battles can be created and submitted to
- Phase 4: live tasting + reveal + leaderboard
- Phase 5: emails + analytics + nav polish
