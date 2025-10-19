import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att se prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { id } = await params

    const subscription = await payload.findByID({
      collection: 'subscriptions',
      id,
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Prenumeration hittades inte' }, { status: 404 })
    }

    // Check if user can access this subscription (own subscription or admin)
    if (String(subscription.user) !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av prenumeration' },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att uppdatera prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { id } = await params
    const { planId, cancelAtPeriodEnd } = await request.json()

    const subscription = await payload.findByID({
      collection: 'subscriptions',
      id,
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Prenumeration hittades inte' }, { status: 404 })
    }

    // Check if user can access this subscription (own subscription or admin)
    if (String(subscription.user) !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    const stripe = getStripeServer()
    const updateData: any = {}

    // Update plan if provided
    if (planId && planId !== subscription.planId) {
      // This would require creating a new subscription or updating the existing one
      // For now, we'll just update the local record
      updateData.planId = planId
    }

    // Update cancellation setting
    if (typeof cancelAtPeriodEnd === 'boolean') {
      updateData.cancelAtPeriodEnd = cancelAtPeriodEnd

      if (subscription.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: cancelAtPeriodEnd,
        })
      }
    }

    // Update subscription in PayloadCMS
    const updatedSubscription = await payload.update({
      collection: 'subscriptions',
      id,
      data: updateData,
    })

    return NextResponse.json({ subscription: updatedSubscription })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av prenumeration' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
    const { id } = await params

    const subscription = await payload.findByID({
      collection: 'subscriptions',
      id,
    })

    if (!subscription) {
      return NextResponse.json({ error: 'Prenumeration hittades inte' }, { status: 404 })
    }

    // Check if user can access this subscription (own subscription or admin)
    if (String(subscription.user) !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    const stripe = getStripeServer()

    // Cancel subscription in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    }

    // Update subscription status in PayloadCMS
    const updatedSubscription = await payload.update({
      collection: 'subscriptions',
      id,
      data: {
        status: 'canceled',
        canceledAt: new Date().toISOString(),
      },
    })

    // Update user subscription status
    await payload.update({
      collection: 'users',
      id: String(subscription.user),
      data: {
        subscriptionStatus: 'canceled',
        subscriptionPlan: 'none',
      },
    })

    return NextResponse.json({ subscription: updatedSubscription })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid avbokning av prenumeration' },
      { status: 500 },
    )
  }
}
