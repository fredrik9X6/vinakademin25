import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getStripeServer, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getSiteURL } from '@/lib/site-url'
import { VINAKADEMIN_PREMIUM, isPremiumPriceId } from '@/lib/stripe-products'
import { loggerFor } from '@/lib/logger'
import { getPayload } from 'payload'
import config from '@/payload.config'

const log = loggerFor('api-subscriptions-checkout')

/**
 * POST /api/subscriptions/checkout
 *
 * Body: { priceId: string }
 * Returns: { url: string }
 *
 * Creates a Stripe Checkout Session for the Vinakademin Premium subscription
 * and returns the redirect URL. Requires the user to be logged in. Rejects
 * if the user already has an active or trialing subscription.
 */
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: { priceId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const priceId = body.priceId?.trim()
  if (!priceId) {
    return NextResponse.json({ error: 'priceId required' }, { status: 400 })
  }
  const plan = isPremiumPriceId(priceId)
  if (!plan) {
    return NextResponse.json(
      { error: 'priceId is not a Vinakademin Premium plan' },
      { status: 400 },
    )
  }

  // Block re-subscribe when already active
  const currentStatus = (user as { subscriptionStatus?: string | null }).subscriptionStatus
  if (currentStatus === 'active' || currentStatus === 'free_trial') {
    return NextResponse.json(
      { error: 'Du har redan ett aktivt medlemskap.' },
      { status: 400 },
    )
  }

  if (!user.email) {
    return NextResponse.json(
      { error: 'Användaren saknar e-postadress.' },
      { status: 400 },
    )
  }

  try {
    const customer = await getOrCreateStripeCustomer(
      user.email,
      String(user.id),
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined,
    )

    // Persist the stripeCustomerId on the user row so the webhook lookup is
    // O(1) on subsequent events (and the /portal endpoint can use it without
    // re-querying Stripe).
    const existingCustomerId = (user as { stripeCustomerId?: string | null }).stripeCustomerId
    if (existingCustomerId !== customer.id) {
      const payload = await getPayload({ config })
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { stripeCustomerId: customer.id } as never,
        overrideAccess: true,
      })
    }

    const stripe = getStripeServer()
    const baseUrl = getSiteURL()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          userId: String(user.id),
          plan,
          kind: VINAKADEMIN_PREMIUM.productKey,
        },
      },
      success_url: `${baseUrl}/prenumeration?welcome=1`,
      cancel_url: `${baseUrl}/bli-medlem?canceled=1`,
      allow_promotion_codes: true,
      metadata: {
        userId: String(user.id),
        plan,
        kind: VINAKADEMIN_PREMIUM.productKey,
      },
    })

    if (!session.url) {
      log.error({ sessionId: session.id }, 'Stripe returned a session without a URL')
      return NextResponse.json({ error: 'Kunde inte skapa betalning.' }, { status: 500 })
    }
    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error({ err, userId: user.id }, 'Failed to create subscription checkout session')
    return NextResponse.json({ error: 'Kunde inte skapa betalning.' }, { status: 500 })
  }
}
