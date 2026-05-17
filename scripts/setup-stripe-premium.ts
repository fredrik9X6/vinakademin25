/**
 * One-time-per-environment setup for the "Vinakademin Premium" subscription
 * product in Stripe. Idempotent — re-running detects existing product/prices
 * by metadata.kind === 'vinakademin_premium' and reuses them.
 *
 * Run:
 *   pnpm tsx --env-file=.env scripts/setup-stripe-premium.ts
 *
 * After running, paste the printed price ids into the environment vars:
 *   STRIPE_PREMIUM_MONTHLY_PRICE_ID
 *   STRIPE_PREMIUM_YEARLY_PRICE_ID
 *
 * NOTE: This uses whatever STRIPE_SECRET_KEY is in the env. Test mode key →
 * test products; live mode key → live products. Don't get them mixed up.
 */
import Stripe from 'stripe'
import { VINAKADEMIN_PREMIUM } from '../src/lib/stripe-products'

const SECRET = process.env.STRIPE_SECRET_KEY
if (!SECRET) {
  console.error('Missing STRIPE_SECRET_KEY — refusing to run.')
  process.exit(1)
}

const stripe = new Stripe(SECRET)

async function findOrCreateProduct(): Promise<Stripe.Product> {
  // Stripe doesn't support querying by metadata directly via list — we filter
  // client-side over the first 100 products.
  const list = await stripe.products.list({ limit: 100, active: true })
  const existing = list.data.find(
    (p) => p.metadata?.kind === VINAKADEMIN_PREMIUM.productKey,
  )
  if (existing) {
    console.log(`✓ Reusing existing product ${existing.id} (${existing.name})`)
    return existing
  }
  const created = await stripe.products.create({
    name: VINAKADEMIN_PREMIUM.productName,
    description: VINAKADEMIN_PREMIUM.productDescription,
    metadata: { kind: VINAKADEMIN_PREMIUM.productKey },
  })
  console.log(`✓ Created product ${created.id} (${created.name})`)
  return created
}

async function findOrCreatePrice(
  product: Stripe.Product,
  interval: 'month' | 'year',
  amountSek: number,
  nickname: string,
): Promise<Stripe.Price> {
  // Filter by recurring interval + amount on the active prices for this product
  const list = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
  const existing = list.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.currency === 'sek' &&
      p.unit_amount === amountSek * 100,
  )
  if (existing) {
    console.log(`✓ Reusing existing ${interval} price ${existing.id} (${nickname})`)
    return existing
  }
  const created = await stripe.prices.create({
    product: product.id,
    currency: 'sek',
    unit_amount: amountSek * 100,
    recurring: { interval },
    nickname,
    metadata: { kind: VINAKADEMIN_PREMIUM.productKey, plan: interval },
  })
  console.log(`✓ Created ${interval} price ${created.id} (${nickname})`)
  return created
}

async function main() {
  console.log(`Setting up Vinakademin Premium in Stripe (${SECRET!.startsWith('sk_test_') ? 'TEST' : 'LIVE'} mode)…\n`)
  const product = await findOrCreateProduct()
  const monthly = await findOrCreatePrice(
    product,
    'month',
    VINAKADEMIN_PREMIUM.monthly.amountSek,
    VINAKADEMIN_PREMIUM.monthly.nickname,
  )
  const yearly = await findOrCreatePrice(
    product,
    'year',
    VINAKADEMIN_PREMIUM.yearly.amountSek,
    VINAKADEMIN_PREMIUM.yearly.nickname,
  )
  console.log('\n--- Add to environment ---')
  console.log(`STRIPE_PREMIUM_MONTHLY_PRICE_ID=${monthly.id}`)
  console.log(`STRIPE_PREMIUM_YEARLY_PRICE_ID=${yearly.id}`)
  console.log('---------------------------\n')
}

main().catch((err) => {
  console.error('Setup failed:', err)
  process.exit(1)
})
