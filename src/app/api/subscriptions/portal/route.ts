import { NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getStripeServer } from '@/lib/stripe'
import { getSiteURL } from '@/lib/site-url'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-subscriptions-portal')

/**
 * POST /api/subscriptions/portal
 *
 * Returns a Stripe Billing Portal URL for the authenticated user. The user
 * must have a stripeCustomerId (set by the checkout flow or webhook). The
 * portal lets the user cancel, change plan, update payment method, view
 * past invoices — all handled by Stripe.
 */
export async function POST() {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  const stripeCustomerId = (user as { stripeCustomerId?: string | null }).stripeCustomerId
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'Inget kopplat konto i Stripe — börja med att starta en prenumeration.' },
      { status: 400 },
    )
  }
  try {
    const stripe = getStripeServer()
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${getSiteURL()}/prenumeration`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    log.error({ err, userId: user.id }, 'Failed to create billing portal session')
    return NextResponse.json({ error: 'Kunde inte öppna prenumerationsportalen.' }, { status: 500 })
  }
}
