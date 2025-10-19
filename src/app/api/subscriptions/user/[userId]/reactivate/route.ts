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
        { error: 'Du måste vara inloggad för att återaktivera prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { userId } = await params

    // Check if user can access this data (own data or admin)
    if (userId !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    // Get user's canceled subscription
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [{ user: { equals: userId } }, { status: { equals: 'canceled' } }],
      },
      limit: 1,
      sort: '-createdAt',
    })

    if (subscriptions.docs.length === 0) {
      return NextResponse.json({ error: 'Ingen avbruten prenumeration hittades' }, { status: 404 })
    }

    const subscription = subscriptions.docs[0]
    const stripe = getStripeServer()

    // Reactivate subscription in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      })
    }

    // Update subscription status in PayloadCMS
    const updatedSubscription = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        status: 'active',
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    })

    // Update user subscription status
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: subscription.interval === 'month' ? 'monthly' : 'annual',
      },
    })

    return NextResponse.json({
      subscription: updatedSubscription,
      message: 'Prenumeration återaktiverad framgångsrikt',
    })
  } catch (error) {
    console.error('Error reactivating subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid återaktivering av prenumeration' },
      { status: 500 },
    )
  }
}
