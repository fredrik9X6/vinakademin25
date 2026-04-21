# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (required — see `packageManager` in package.json). Node 18.20.2+ or 20.9.0+.

- `pnpm dev` — Start Next.js + Payload (http://localhost:3000, admin at `/admin`)
- `pnpm devsafe` — Same, but clears `.next` first (use if dev build gets stuck)
- `pnpm build` — Production build. Runs `generate:importmap` then `next build --experimental-build-mode compile`
- `pnpm start` — Serve production build
- `pnpm lint` — Next.js ESLint
- `pnpm generate:types` — Regenerate `src/payload-types.ts` from Payload config. **Run after any collection change.**
- `pnpm generate:importmap` — Regenerate Payload admin import map. Required after adding/removing plugins or custom admin components.
- `pnpm payload <cmd>` — Payload CLI (e.g. `pnpm payload migrate`)
- `pnpm sync-stripe` — `scripts/sync-courses-with-stripe.js` (syncs course products/prices)
- `pnpm cleanup-media` — `scripts/cleanup-missing-media.ts`
- `pnpm send-review-emails` — `scripts/send-review-emails.ts`

No test suite is configured.

## Architecture

**Stack:** Next.js 15 App Router (React 19) + Payload CMS 3.33 + Postgres + Stripe + Mux + Resend + S3 media. TypeScript, Tailwind, Shadcn UI.

### Single Next.js app, two route groups

`src/app/(frontend)` hosts the public site and user-facing pages; `src/app/(payload)` hosts the Payload admin (`/admin`) and Payload's internal API routes. Both share the same Next process — Payload is mounted inside Next.js, not a separate server.

- `(frontend)/(site)/*` — public + authenticated site routes in Swedish (e.g. `vinprovningar`, `vinkompass`, `vinlistan`, `mina-sidor`, `checkout`). The site is Swedish-language; route segments and many identifiers are in Swedish.
- `(frontend)/(auth)/*` — auth flows: `logga-in`, `registrera`, `glomt-losenord`, `aterstall-losenord`, `verifiera-epost`, `aktivera-konto`, `onboarding`.
- `src/app/api/*` — custom (non-Payload) Next route handlers: Stripe `webhooks`, `payments`, `orders`, `subscriptions`, `mux`, `cron`, `revalidate`, quiz/progress, etc. Payload's own REST/GraphQL lives under `(payload)/api`.

### Payload collections (`src/collections/`)

~25 collections drive the domain. Main groups:
- **Content:** `Vinprovningar` (tastings/courses), `Modules`, `ContentItems` (lessons), `Questions`, `BlogPosts`/`BlogCategories`/`BlogTags`, `Media`.
- **Wine data:** `Wines`, `Grapes`, `Countries`, `Regions`, `UserWines`, `UserWineLists`, `Reviews`.
- **Users & progress:** `Users`, `Enrollments`, `UserProgress`, `QuizAttempts`, `CourseReviews`.
- **Commerce:** `Orders`, `Transactions`, `Subscriptions` (Stripe-backed).
- **Live sessions:** `CourseSessions`, `SessionParticipants`.

Generated types live in `src/payload-types.ts` — always regenerate after collection edits, never hand-edit.

### Access control

Centralized in `src/lib/access.ts` and `src/lib/access-control.ts`. See `.cursor/rules/payloadcms-v3.mdc` and `docs/payload-acl.md` — **Payload v3 APIs only**. Use `Access` and `PayloadRequest` types imported from `payload` (not `payload/types`, which is v2). Do not invent types that duplicate Payload types; if the type doesn't exist in v3, rethink the approach. All `@payloadcms/*` packages are pinned to exact version `3.33.0` — never widen to `^` or `~`.

### Integrations

- **Stripe** (`src/lib/stripe.ts`, `stripe-products.ts`) — checkout, subscriptions, webhooks under `src/app/api/webhooks` and `api/payments`. Guest checkout is supported for wine tastings.
- **Mux** (`src/lib/mux.ts`) — video playback/upload for course lessons; webhooks under `api/mux`.
- **Resend** — transactional email via `@payloadcms/email-resend` configured in `payload.config.ts`. Templates in `src/lib/email-templates.ts`.
- **S3** — media storage via `@payloadcms/storage-s3`. Dev/prod prefix auto-split (`dev/` vs `production/`) to keep environments isolated. Plugin is always included (even without env vars) so the import map generates during build.
- **PostHog** — client analytics (`posthog-js`).

### Config quirks worth knowing

- `payload.config.ts` normalizes `PAYLOAD_PUBLIC_SERVER_URL` / `NEXT_PUBLIC_SITE_URL` to always include a protocol (Railway may strip it).
- DB uses `postgresAdapter({ push: true })` — schema is pushed, not migration-driven. Treat schema changes carefully on shared envs.
- Build uses `PAYLOAD_DROP_DATABASE=false` and `--experimental-build-mode compile` — don't change lightly.
- Placeholder DB string and `PAYLOAD_SECRET` fallback exist so build works without env vars; real values required at runtime.

### Middleware

`src/middleware.ts` handles auth/routing redirects (e.g. legacy `/reset-password` → Swedish path).

## Conventions

- Swedish for user-facing copy and many route slugs; keep new routes consistent.
- Shadcn UI components live in `src/components/ui/` via `components.json`.
- Utilities: `src/lib/utils.ts` exports `cn()` (clsx + tailwind-merge). Server-only Payload access via `getPayload` in `src/lib/payload.ts`.
- Numerous historical planning/fix markdown files at repo root (`*_PLAN.md`, `*_FIXES*.md`, etc.) — treat as historical context, not current docs.
