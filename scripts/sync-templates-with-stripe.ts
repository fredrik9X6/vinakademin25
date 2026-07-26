/**
 * Sync every published paid tasting template with Stripe.
 *
 * Run with `pnpm sync-templates`. Mirrors `pnpm sync-stripe` for video courses.
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.2)
 */

// Env loading happens via `tsx --env-file=.env` in package.json (matches the
// existing seed:vinkompassen pattern). Doing it via `dotenv.config()` here
// doesn't work because ESM hoists `import` statements above top-level code, so
// payload.config.ts evaluates `process.env.DATABASE_URI` before any
// loadDotenv() call ever fires.

import { syncAllTemplatesWithStripe } from '../src/lib/stripe-products'

async function main() {
  console.log('Syncing all paid tasting templates with Stripe...')
  await syncAllTemplatesWithStripe()
  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error('sync-templates failed:', err)
  process.exit(1)
})
