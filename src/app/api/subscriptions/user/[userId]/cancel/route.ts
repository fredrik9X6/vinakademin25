import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att avbryta prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { userId } = await params

    // Check if user can access this data (own data or admin)
    if (userId !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    // Get user's current subscription
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [{ user: { equals: userId } }, { status: { equals: 'active' } }],
      },
      limit: 1,
    })

    if (subscriptions.docs.length === 0) {
      return NextResponse.json({ error: 'Ingen aktiv prenumeration hittades' }, { status: 404 })
    }

    const subscription = subscriptions.docs[0]
    const stripe = getStripeServer()

    // Cancel subscription in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    }

    // Update subscription status in PayloadCMS
    const updatedSubscription = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        status: 'canceled',
        canceledAt: new Date().toISOString(),
        cancelAtPeriodEnd: true,
      },
    })

    // Update user subscription status
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        subscriptionStatus: 'canceled',
        subscriptionPlan: 'none',
      },
    })

    return NextResponse.json({
      subscription: updatedSubscription,
      message: 'Prenumeration avbruten framgångsrikt',
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid avbokning av prenumeration' },
      { status: 500 },
    )
  }
}
