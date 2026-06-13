/**
 * Sync every published paid tasting template with Stripe.
 *
 * Run with `pnpm sync-templates`. Mirrors `pnpm sync-stripe` for video courses.
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.2)
 */

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
