import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe-products'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att skapa en prenumeration' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { planId, paymentMethodId } = await request.json()

    if (!planId) {
      return NextResponse.json({ error: 'Plan-ID krävs' }, { status: 400 })
    }

    // Find the subscription plan
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
    if (!plan) {
      return NextResponse.json({ error: 'Ogiltig prenumerationsplan' }, { status: 400 })
    }

    // Check if user already has an active subscription
    const existingSubscription = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [{ user: { equals: user.id.toString() } }, { status: { equals: 'active' } }],
      },
      limit: 1,
    })

    if (existingSubscription.docs.length > 0) {
      return NextResponse.json({ error: 'Du har redan en aktiv prenumeration' }, { status: 400 })
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      user.email!,
      user.id.toString(),
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    )

    const stripe = getStripeServer()

    // Create Stripe subscription
    const subscriptionData: any = {
      customer: customer.id,
      items: [
        {
          price: plan.stripePriceId,
        },
      ],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email!,
        planId: plan.id,
      },
    }

    // Add payment method if provided
    if (paymentMethodId) {
      subscriptionData.default_payment_method = paymentMethodId
    }

    const subscription = await stripe.subscriptions.create(subscriptionData)

    // Create subscription record in PayloadCMS
    const subscriptionRecord = await payload.create({
      collection: 'subscriptions',
      data: {
        subscriptionNumber: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        user: user.id,
        status:
          subscription.status === 'incomplete' || subscription.status === 'incomplete_expired'
            ? 'active'
            : subscription.status,
        planId: plan.id as 'wine_club_monthly' | 'wine_club_yearly',
        amount: plan.price,
        currency: 'SEK',
        interval: plan.interval,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customer.id,
        stripePriceId: plan.stripePriceId,
        currentPeriodStart: new Date(
          (subscription as any).current_period_start * 1000,
        ).toISOString(),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
        features: plan.features.map((feature) => ({ feature })),
        metadata: {
          planName: plan.name,
          planDescription: plan.description,
        },
      },
    })

    // Update user subscription status
    await payload.update({
      collection: 'users',
      id: user.id.toString(),
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: plan.interval === 'month' ? 'monthly' : 'annual',
      },
    })

    return NextResponse.json({
      subscription: subscriptionRecord,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av prenumeration' },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att se prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // Check if user can access this data (own data or admin)
    if (userId && userId !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    const targetUserId = userId || user.id.toString()

    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: targetUserId },
      },
      sort: '-createdAt',
    })

    return NextResponse.json({ subscriptions: subscriptions.docs })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av prenumerationer' },
      { status: 500 },
    )
  }
}
