# Session Polish Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Chunk 1 of the group-session UX work — add a QR code to the host's share modal and rewrite `/delta` to branch on session status (active / paused / completed / expired / full / not_found) instead of bouncing failures into a post-submit red alert.

**Architecture:** One new helper `lookupSessionByCode()` in `src/lib/sessions.ts` is the single source of truth for status checks (DRY). It's called both from a new `GET /api/sessions/lookup` endpoint (used by the client poller) and directly from the `/delta` server component (avoids an HTTP roundtrip during SSR). `/delta` becomes a server component that branches by status; the active branch keeps rendering the existing `JoinSessionDialog`, the other branches render purpose-built copy + CTA. A small client component `<PausedWatcher>` polls the lookup endpoint every 5 s and `router.refresh()`-es when the host resumes. The QR addition is a single new section in the existing `StartSessionButton` share modal using `qrcode.react`.

**Tech Stack:** Next.js 15 App Router (React 19), Payload CMS 3.33, TypeScript, Tailwind, Shadcn UI, `qrcode.react` (new). No new schema, no migration, no `payload-types` regen.

**Spec:** `docs/superpowers/specs/2026-05-09-session-polish-bundle-design.md`

**Test discipline:** This project has no test suite (per CLAUDE.md). Each task uses manual verification commands (curl + page loads in dev) instead of automated tests. Where the spec defines explicit state branches, the manual verification covers each branch.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/lib/sessions.ts` | modify | Add `lookupSessionByCode()` + `LookupSessionResult` type alongside the existing `getActiveParticipantSession()` helper. |
| `src/app/api/sessions/lookup/route.ts` | create | `GET ?code=ABC123` → returns the `LookupSessionResult`. Public, read-only. |
| `src/app/(frontend)/(site)/delta/page.tsx` | rewrite | Server component. No code → existing dialog. With code → status branch. |
| `src/app/(frontend)/(site)/delta/PausedWatcher.tsx` | create | Client poller, 5 s interval, calls `router.refresh()` on status change, aborts on unmount. |
| `src/components/course/StartSessionButton.tsx` | modify | Add a QR section in the share modal below the Direktlänk row. |
| `package.json` / `pnpm-lock.yaml` | modify | Add `qrcode.react` dependency. |

No collection or migration changes.

---

### Task 1: Add `lookupSessionByCode` helper and install QR library

**Files:**
- Modify: `src/lib/sessions.ts`
- Modify: `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install `qrcode.react`**

Run:
```bash
pnpm add qrcode.react
```

Expected: a new `"qrcode.react": "^4.x.x"` entry in `package.json` dependencies; `pnpm-lock.yaml` updated.

- [ ] **Step 2: Add the helper to `src/lib/sessions.ts`**

Open `src/lib/sessions.ts`. After the existing `getActiveParticipantSession` function (at end of file), append:

```ts
export type LookupStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'expired'
  | 'full'
  | 'not_found'

export interface LookupSessionResult {
  status: LookupStatus
  course?: { title: string; slug: string }
  sessionName?: string | null
  participantCount?: number
  maxParticipants?: number | null
}

const JOIN_CODE_RE = /^[A-Z0-9]{6}$/

/**
 * Resolves a 6-char join code to a status flag the /delta landing page can
 * branch on. Mirrors the entry-condition checks in /api/sessions/join but
 * has no side effects — it's a read-only twin so the page can render the
 * right UI before asking the user for a nickname.
 *
 * Malformed codes (wrong length, non-alphanumeric) collapse into 'not_found'
 * — same UX, less branching at call sites.
 */
export async function lookupSessionByCode(
  payload: Payload,
  code: string | null | undefined,
): Promise<LookupSessionResult> {
  const normalized = (code ?? '').trim().toUpperCase()
  if (!JOIN_CODE_RE.test(normalized)) {
    return { status: 'not_found' }
  }

  try {
    const res = await payload.find({
      collection: 'course-sessions',
      where: { joinCode: { equals: normalized } },
      limit: 1,
      depth: 1, // populate `course`
    })
    const session = res.docs[0]
    if (!session) return { status: 'not_found' }

    const courseRef = session.course
    const course =
      typeof courseRef === 'object' && courseRef
        ? { title: courseRef.title, slug: courseRef.slug || String(courseRef.id) }
        : undefined

    const baseFields: Pick<LookupSessionResult, 'course' | 'sessionName' | 'participantCount' | 'maxParticipants'> = {
      course,
      sessionName: session.sessionName ?? null,
      participantCount: Number(session.participantCount ?? 0),
      maxParticipants:
        session.maxParticipants !== null && session.maxParticipants !== undefined
          ? Number(session.maxParticipants)
          : null,
    }

    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      return { status: 'expired', ...baseFields }
    }
    if (session.status === 'completed') {
      return { status: 'completed', ...baseFields }
    }
    if (session.status === 'paused') {
      return { status: 'paused', ...baseFields }
    }
    if (
      baseFields.maxParticipants !== null &&
      (baseFields.participantCount ?? 0) >= baseFields.maxParticipants
    ) {
      return { status: 'full', ...baseFields }
    }
    return { status: 'active', ...baseFields }
  } catch (err) {
    log.error({ err, code: normalized }, 'lookupSessionByCode_failed')
    // Treat infrastructure errors as not_found — the UI can already handle that
    // state and we don't want to leak a 500 to a public landing page.
    return { status: 'not_found' }
  }
}
```

The `Payload` import + `log` are already in scope at the top of the file from the existing helper.

- [ ] **Step 3: Verify the helper compiles**

Run:
```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "src/lib/sessions" | head
```

Expected: no output (no new errors in `src/lib/sessions.ts`). Pre-existing errors elsewhere in the codebase are fine.

- [ ] **Step 4: Commit**

```bash
git add src/lib/sessions.ts package.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
sessions: add lookupSessionByCode helper + qrcode.react dep

Read-only status check used by the upcoming /api/sessions/lookup
endpoint and the /delta server component. Mirrors the entry-condition
checks in /api/sessions/join without side effects — DRY source of truth
for the six landing-page branches (active/paused/completed/expired/full/
not_found). Malformed codes collapse to not_found.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Add `GET /api/sessions/lookup`

**Files:**
- Create: `src/app/api/sessions/lookup/route.ts`

- [ ] **Step 1: Create the route file**

Create `src/app/api/sessions/lookup/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { lookupSessionByCode } from '@/lib/sessions'

/**
 * GET /api/sessions/lookup?code=ABC123
 *
 * Read-only status check. Always returns 200 with a `status` field; the page
 * branches on status rather than HTTP code. See lookupSessionByCode in
 * src/lib/sessions.ts for the status semantics.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const payload = await getPayload({ config })
  const result = await lookupSessionByCode(payload, code)

  return NextResponse.json(result, {
    status: 200,
    headers: {
      // Don't cache between participants — status flips matter for the paused
      // → active recovery flow.
      'Cache-Control': 'no-store',
    },
  })
}
```

- [ ] **Step 2: Smoke-test against an active session**

Start dev server (skip if already running):
```bash
pnpm dev > /tmp/dev.log 2>&1 &
```

Wait for ready (server boots in ~10s):
```bash
until curl -s --max-time 3 http://localhost:3000/api/users/me >/dev/null 2>&1; do sleep 2; done; echo ready
```

Find a real `joinCode` from the local DB:
```bash
PGPASSWORD=npg_Eb7p4jxYzmrF psql "postgresql://neondb_owner@ep-super-poetry-a2z7zldz-pooler.eu-central-1.aws.neon.tech/vinakademin?sslmode=require&channel_binding=require" -c "SELECT join_code, status FROM course_sessions ORDER BY created_at DESC LIMIT 5;"
```

If a row exists with `status=active`, hit lookup:
```bash
curl -s "http://localhost:3000/api/sessions/lookup?code=<JOINCODE>" | python3 -m json.tool
```

Expected: JSON with `"status": "active"`, populated `course`, `sessionName`, `participantCount`, `maxParticipants`.

- [ ] **Step 3: Smoke-test the four error branches**

```bash
# not_found via missing code
curl -s "http://localhost:3000/api/sessions/lookup" -w "\nHTTP %{http_code}\n"
# Expected: {"status":"not_found"} HTTP 200

# not_found via malformed code
curl -s "http://localhost:3000/api/sessions/lookup?code=abc" -w "\nHTTP %{http_code}\n"
# Expected: {"status":"not_found"} HTTP 200

# not_found via unknown but well-formed code
curl -s "http://localhost:3000/api/sessions/lookup?code=ZZZZZZ" -w "\nHTTP %{http_code}\n"
# Expected: {"status":"not_found"} HTTP 200
```

For paused/completed/expired/full: skip if no test data exists. The branches are exercised by the same `lookupSessionByCode` logic that already passed the active check; manual coverage of all six is performed in Task 3 once the page renders them.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sessions/lookup/route.ts
git commit -m "$(cat <<'EOF'
sessions: add GET /api/sessions/lookup read-only status endpoint

Public, no side effects. Always returns 200 with a status flag — the
landing page branches on status rather than HTTP code. Used by the
/delta server component for SSR pre-flight and by the paused-watcher
client poller for recovery.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Rewrite `/delta` as a status-aware server component

**Files:**
- Modify: `src/app/(frontend)/(site)/delta/page.tsx`

This task replaces the entire page. The active branch + the no-code branch render the existing `JoinSessionDialog` (no behavioral change for those paths); the other branches render purpose-built UIs.

- [ ] **Step 1: Replace the page contents**

Open `src/app/(frontend)/(site)/delta/page.tsx`. Replace the whole file with:

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import JoinSessionDialog from '@/components/course/JoinSessionDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, Users, XCircle } from 'lucide-react'
import { lookupSessionByCode, type LookupSessionResult } from '@/lib/sessions'
import { PausedWatcher } from './PausedWatcher'

export const metadata: Metadata = {
  title: 'Gå med i en vinprovning | Vinakademin',
  description: 'Anslut till en pågående grupprovning med koden från arrangören.',
  robots: { index: false, follow: false },
}

interface JoinPageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { code: rawCode } = await searchParams
  const code = (rawCode || '').trim().toUpperCase()

  // No code → render the existing manual-entry dialog (today's UX).
  if (!code) {
    return (
      <PageShell>
        <JoinSessionDialog isOpen onClose={() => {}} standalone initialCode="" />
      </PageShell>
    )
  }

  const payload = await getPayload({ config })
  const lookup = await lookupSessionByCode(payload, code)

  if (lookup.status === 'active') {
    return (
      <PageShell>
        <JoinSessionDialog isOpen onClose={() => {}} standalone initialCode={code} />
      </PageShell>
    )
  }

  if (lookup.status === 'paused') {
    return (
      <PageShell>
        <PausedState lookup={lookup} code={code} />
      </PageShell>
    )
  }

  if (lookup.status === 'completed') {
    return (
      <PageShell>
        <EndedState
          icon={<XCircle className="h-6 w-6" />}
          heading="Sessionen är slut"
          body="Den här grupprovningen är avslutad. Vi har många fler."
          courseTitle={lookup.course?.title}
        />
      </PageShell>
    )
  }

  if (lookup.status === 'expired') {
    return (
      <PageShell>
        <EndedState
          icon={<Clock className="h-6 w-6" />}
          heading="Sessionen har gått ut"
          body="Tiden för att ansluta har löpt ut."
          courseTitle={lookup.course?.title}
        />
      </PageShell>
    )
  }

  if (lookup.status === 'full') {
    return (
      <PageShell>
        <FullState lookup={lookup} />
      </PageShell>
    )
  }

  // not_found
  return (
    <PageShell>
      <NotFoundState />
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container max-w-2xl mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-heading mb-4">Gå med i en vinprovning</h1>
        <p className="text-muted-foreground">
          Ange koden du fick från arrangören för att ansluta
        </p>
      </div>
      {children}
    </div>
  )
}

function StateCard({
  tone = 'default',
  icon,
  heading,
  courseTitle,
  children,
}: {
  tone?: 'default' | 'warning'
  icon: React.ReactNode
  heading: string
  courseTitle?: string
  children: React.ReactNode
}) {
  const toneCls =
    tone === 'warning'
      ? 'border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/20'
      : 'border-border bg-background'
  return (
    <div className={`rounded-lg border ${toneCls} p-6 space-y-4`}>
      <div className="flex items-center gap-3 text-foreground">
        {icon}
        <h2 className="text-xl font-heading">{heading}</h2>
      </div>
      {courseTitle && (
        <p className="text-sm text-muted-foreground">
          Vinprovning: <span className="text-foreground">{courseTitle}</span>
        </p>
      )}
      {children}
    </div>
  )
}

function PausedState({ lookup, code }: { lookup: LookupSessionResult; code: string }) {
  return (
    <>
      <StateCard
        tone="warning"
        icon={<AlertCircle className="h-6 w-6 text-amber-500" />}
        heading="Värden har pausat sessionen"
        courseTitle={lookup.course?.title}
      >
        <p className="text-sm text-muted-foreground">
          Du kan ansluta så snart värden återupptar. Vi kollar automatiskt.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          Väntar på att sessionen ska återupptas…
        </div>
      </StateCard>
      <PausedWatcher code={code} />
    </>
  )
}

function EndedState({
  icon,
  heading,
  body,
  courseTitle,
}: {
  icon: React.ReactNode
  heading: string
  body: string
  courseTitle?: string
}) {
  return (
    <StateCard icon={icon} heading={heading} courseTitle={courseTitle}>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button asChild className="btn-brand">
        <Link href="/vinprovningar">Bläddra vinprovningar →</Link>
      </Button>
    </StateCard>
  )
}

function FullState({ lookup }: { lookup: LookupSessionResult }) {
  const count = lookup.participantCount ?? 0
  const max = lookup.maxParticipants ?? 0
  return (
    <StateCard
      icon={<Users className="h-6 w-6" />}
      heading="Sessionen är full"
      courseTitle={lookup.course?.title}
    >
      <p className="text-sm text-muted-foreground">
        {count} av {max} deltagare har redan anslutit.
      </p>
      <Button asChild className="btn-brand">
        <Link href="/vinprovningar">Bläddra vinprovningar →</Link>
      </Button>
    </StateCard>
  )
}

function NotFoundState() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Hittar ingen session med den koden</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>Dubbelkolla koden från värden.</p>
        <Button asChild variant="outline">
          <Link href="/delta">Försök igen →</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

Run:
```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "delta/page" | head
```

Expected: no output. (`PausedWatcher` import will resolve once Task 4 creates the file — for now this step expects no NEW errors beyond the missing module, which TS may flag. If you see the missing-module error now, that's expected and clears in Task 4.)

If you'd rather avoid the temporary error: do Task 4 before this step's verification. The order is otherwise commutative.

- [ ] **Step 3: Smoke-test the no-code path**

With dev server running, open in a browser:
```
http://localhost:3000/delta
```

Expected: the existing `JoinSessionDialog` standalone view renders, code field empty.

- [ ] **Step 4: Smoke-test the active path**

Using a real active `joinCode` from the DB:
```
http://localhost:3000/delta?code=<JOINCODE>
```

Expected: same `JoinSessionDialog` view, code field prefilled with `<JOINCODE>`.

- [ ] **Step 5: Smoke-test the not_found path**

```
http://localhost:3000/delta?code=ZZZZZZ
```

Expected: red `Alert` titled "Hittar ingen session med den koden" with "Försök igen →" button. Click the button → lands on bare `/delta`.

- [ ] **Step 6: Smoke-test paused / completed / full states by direct DB mutation**

Pick an existing `course-sessions` row by id (use `PGPASSWORD=...` psql line from Task 2). For each branch:

```sql
-- Paused (skip if PausedWatcher is not yet built; covered in Task 4)
UPDATE course_sessions SET status='paused' WHERE id=<ID>;

-- Completed
UPDATE course_sessions SET status='completed' WHERE id=<ID>;

-- Reset to active when done
UPDATE course_sessions SET status='active' WHERE id=<ID>;
```

After each UPDATE, hit `/delta?code=<JOINCODE>` and confirm the right state card renders. **Do not run these against the prod-shared DB if you're worried about side effects** — the same Neon DB serves prod. Use a session you own or skip this step until you have a local-only setup. The branches are still tested by Task 4's verification when paused recovery is exercised.

- [ ] **Step 7: Commit**

```bash
git add 'src/app/(frontend)/(site)/delta/page.tsx'
git commit -m "$(cat <<'EOF'
delta: status-aware landing page replaces post-submit error UX

/delta becomes a server component that pre-flights the joinCode via
lookupSessionByCode and branches on the resulting status. Active and
no-code paths still render the existing JoinSessionDialog (no
behavioral change). Paused, completed, expired, full, and not_found
each get a purpose-built card with appropriate copy and CTA. The
PausedWatcher client component (next commit) handles paused → active
recovery.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Add `<PausedWatcher>` client poller

**Files:**
- Create: `src/app/(frontend)/(site)/delta/PausedWatcher.tsx`

- [ ] **Step 1: Create the component**

Create `src/app/(frontend)/(site)/delta/PausedWatcher.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 5_000

/**
 * Polls /api/sessions/lookup every 5 s. While the response status stays
 * `paused` we do nothing. As soon as it changes (typically to `active`),
 * we trigger a router.refresh() so the parent server component re-renders
 * with the new branch. The poll aborts on unmount.
 */
export function PausedWatcher({ code }: { code: string }) {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/sessions/lookup?code=${encodeURIComponent(code)}`,
          { cache: 'no-store', signal: controller.signal },
        )
        if (cancelled) return
        const data = (await res.json()) as { status?: string }
        if (data.status && data.status !== 'paused') {
          router.refresh()
          // Stop polling — the refresh will unmount us if the new state
          // isn't paused, which clears the interval below.
        }
      } catch {
        // Network blip or aborted fetch — keep polling.
      }
    }

    const id = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      controller.abort()
      clearInterval(id)
    }
  }, [code, router])

  return null
}
```

- [ ] **Step 2: Verify TypeScript**

Run:
```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "delta/(page|PausedWatcher)" | head
```

Expected: no output. The Task 3 page can now resolve its `PausedWatcher` import.

- [ ] **Step 3: Smoke-test the paused → active flow**

With dev server running and a session you own:

1. Open in a browser: `http://localhost:3000/delta?code=<JOINCODE>` (session is active → join dialog renders).
2. In another tab/terminal, set the session paused:
   ```sql
   UPDATE course_sessions SET status='paused' WHERE id=<ID>;
   ```
3. Reload `/delta?code=<JOINCODE>` → paused state card should render with the pulsing dot.
4. Open DevTools → Network. Confirm a `lookup` request fires every ~5 s.
5. In the other terminal, flip the session back:
   ```sql
   UPDATE course_sessions SET status='active' WHERE id=<ID>;
   ```
6. Within ~5 s the page should refresh into the active `JoinSessionDialog` view.
7. Network panel: lookup polling should stop after the refresh.

- [ ] **Step 4: Verify abort-on-unmount**

1. Reload `/delta?code=<paused JOINCODE>` so polling starts.
2. In DevTools Network, watch the `lookup` requests.
3. Navigate away (click "Bläddra vinprovningar" on a sibling state, or change the URL).
4. Confirm: no further `lookup` requests fire after navigation. The pending request (if any) shows as cancelled.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(frontend)/(site)/delta/PausedWatcher.tsx'
git commit -m "$(cat <<'EOF'
delta: paused-state auto-recovery via 5s lookup poll

PausedWatcher polls /api/sessions/lookup every 5s while the parent
server component renders the paused state. As soon as the status
flips off paused, router.refresh() re-runs the server lookup and the
page swaps into the active branch (or whichever new state applies).
Aborts on unmount.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Add QR section to `StartSessionButton`

**Files:**
- Modify: `src/components/course/StartSessionButton.tsx`

- [ ] **Step 1: Add the import**

In `src/components/course/StartSessionButton.tsx`, add this import alongside the existing imports near the top of the file:

```ts
import { QRCodeSVG } from 'qrcode.react'
```

- [ ] **Step 2: Add the QR section in the share modal**

Find the block that renders `Direktlänk` (around line 207–223 — the section ending with `</div>` after the `<Input readOnly value={...}>` and the `<Button onClick={handleCopyLink}>` with `<ExternalLink>` icon). Immediately after that closing `</div>` of the Direktlänk row, and before the `<Alert>` block, insert:

```tsx
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                    <div className="flex-1 border-t border-border" />
                    Eller skanna
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div className="flex justify-center py-2">
                    <div className="rounded-md bg-white p-3 shadow-sm">
                      <QRCodeSVG
                        value={`${window.location.origin}/delta?code=${session?.joinCode}`}
                        size={192}
                        level="M"
                      />
                    </div>
                  </div>
                </div>
```

The `bg-white p-3` wrapper is essential — `QRCodeSVG` defaults to a transparent background, which fails on dark themes when phones try to scan.

- [ ] **Step 3: Verify TypeScript and ensure dev rebuild**

Run:
```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "StartSessionButton" | head
```

Expected: no output.

If dev server is running, it should hot-reload. Otherwise restart:
```bash
pnpm dev > /tmp/dev.log 2>&1 &
```

- [ ] **Step 4: Smoke-test the QR rendering and content**

1. Log in as a user with course access (admin or instructor).
2. Navigate to a tasting page where `StartSessionButton` shows.
3. Click "Starta gruppsession" → fill the form → click Start.
4. The "Session skapad!" view appears. Confirm:
   - The 6-char code is visible at top.
   - The Direktlänk row is visible.
   - "ELLER SKANNA" divider appears below.
   - A 192×192 QR renders inside a white card.
5. Scan the QR with a phone camera. Expected: opens `https://localhost:3000/delta?code=<CODE>` (will fail to load on the phone but the URL preview should match).
6. To verify the URL is correct without a scanner, right-click the QR SVG → Inspect: the SVG's value matches `${window.location.origin}/delta?code=${joinCode}`.

- [ ] **Step 5: Commit**

```bash
git add src/components/course/StartSessionButton.tsx
git commit -m "$(cat <<'EOF'
sessions: QR code in host share modal for in-person joins

Adds a 192×192 QR (qrcode.react) below the Direktlänk row in the
StartSessionButton share modal. Encodes the same /delta?code=… URL
the link button already copies — guests scan instead of typing the
6-char code on their phone. White-card wrapper ensures the QR is
scannable on dark themes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: End-to-end verification + push

**Files:** none modified.

- [ ] **Step 1: Lint clean**

Run:
```bash
pnpm lint 2>&1 | tail -3
```

Expected: `✔ No ESLint warnings or errors`.

- [ ] **Step 2: TypeScript clean for changed files**

Run:
```bash
pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -E "(delta|sessions/lookup|StartSessionButton|lib/sessions\.ts)" | head
```

Expected: no output (no new TS errors in any of the touched files).

- [ ] **Step 3: Run through the spec's six branches one more time**

With dev server running, manually visit each in a browser:

| URL pattern | Expected UI |
|---|---|
| `/delta` | Existing JoinSessionDialog, empty code |
| `/delta?code=<active>` | Existing JoinSessionDialog, code prefilled |
| `/delta?code=<paused>` | Paused state with pulsing indicator (set status=paused via SQL) |
| `/delta?code=<completed>` | "Sessionen är slut" + browse CTA |
| `/delta?code=<expired>` | "Sessionen har gått ut" + browse CTA (set expires_at to a past timestamp) |
| `/delta?code=<full>` | "Sessionen är full — N/Max" + browse CTA |
| `/delta?code=ZZZZZZ` | not_found alert + Försök igen → /delta |

Reset any modified DB rows back to their original values when done.

- [ ] **Step 4: Push to staging and production**

```bash
git push origin main
git checkout production
git merge main --no-ff -m "merge: session polish bundle (QR + status-aware /delta)"
git push origin production
git checkout main
```

- [ ] **Step 5: Live verification**

Once Railway production rebuilds:
1. Hit `https://www.vinakademin.se/delta?code=ZZZZZZ` → not_found UI renders.
2. As a host, start a session → confirm QR appears in the share modal.
3. Scan the QR with a phone → lands on `/delta?code=…` with the active join form.

---

## Self-Review

**Spec coverage check:**

| Spec section | Plan task |
|---|---|
| §1 New API `GET /api/sessions/lookup` | Task 2 |
| §1 Status derivation table (active/paused/completed/expired/full/not_found) | Task 1 (helper logic) + Task 2 (route) |
| §1 Malformed input → not_found | Task 1 (`JOIN_CODE_RE` check) |
| §1 No 4xx, only 5xx on internal error | Task 1 (catch → not_found) + Task 2 (always 200) |
| §2 `/delta` page rewrite + six state branches | Task 3 |
| §2 PausedWatcher polling 5s + auto-flip | Task 4 |
| §2 not_found "Försök igen → /delta" CTA | Task 3 (NotFoundState) |
| §2 Course title shown on every error state | Task 3 (StateCard `courseTitle` prop) |
| §3 QR section in share modal, 192px, qrcode.react | Task 5 + Task 1 (dep install) |
| §3 No fullscreen / presentation mode | Not in plan ✓ |
| §4 Copy table | Task 3 (inline strings) |
| Files-touched list | Tasks 1, 2, 3, 4, 5 |
| No migration / no type regen | Confirmed — no Payload schema changes |

**Placeholder scan:** No "TBD"/"TODO"/"implement later" in any step. Each code step contains complete code. Each verification step has explicit commands and expected output.

**Type consistency:** `LookupSessionResult` defined in Task 1 is imported by name in Tasks 2 and 3. `LookupStatus` is exported. `PausedWatcher` signature `(code: string)` matches its usage in Task 3. `QRCodeSVG` import in Task 5 matches the `qrcode.react` package's export name.

No issues found.
