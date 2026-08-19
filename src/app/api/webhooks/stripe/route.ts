import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, validateWebhookSignature } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { getSiteURL } from '@/lib/site-url'
import { loggerFor } from '@/lib/logger'
import { sendTeamNotification } from '@/lib/notify-team'
import { buildOrderPaidEmail } from '@/lib/team-emails/order-paid'
import { recordEvent } from '@/lib/events'
import { sendWelcomePremiumEmail } from '@/lib/send-welcome-premium-email'

const log = loggerFor('stripe-webhook')

// Disable body parsing to get raw body for Stripe signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // Get raw body as array buffer to preserve exact format for signature verification
  const body = await request.arrayBuffer()
  const bodyBuffer = Buffer.from(body)

  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    log.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 })
  }

  let event: any

  try {
    // Validate webhook signature using raw buffer
    event = validateWebhookSignature(bodyBuffer, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    // In development with ngrok, signature verification can fail due to request modification
    // Log but don't fail - Stripe will retry and some events may still succeed
    const errorMessage = err?.message || String(err)

    // Try to parse the event anyway for development/debugging
    // In production, you should always verify signatures
    const isDevelopment = process.env.NODE_ENV === 'development'

    if (isDevelopment && errorMessage.includes('No signatures found')) {
      log.warn('Webhook signature verification failed (likely due to ngrok). Attempting to parse event anyway')
      try {
        // Try to parse the event manually for development
        // Note: Stripe webhook events have structure: { type, data: { object: {...} } }
        const eventData = JSON.parse(bodyBuffer.toString('utf-8'))

        // Ensure event has the correct structure
        if (eventData && typeof eventData === 'object') {
          event = eventData
          log.warn({ eventType: event?.type || 'unknown' }, 'Bypassed signature verification')
        } else {
          throw new Error('Invalid event structure')
        }
      } catch (parseError) {
        log.error({ err: parseError }, 'Could not parse webhook body')
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
      }
    } else {
      log.error({ err: errorMessage }, 'Webhook signature verification failed')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  const payload = await getPayload({ config })
  const stripe = getStripeServer()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, payload, stripe)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, payload)
        break

      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object, payload, stripe)
        break

      case 'invoice.payment_succeeded':
        await handleSubscriptionPaymentSucceeded(event.data.object, payload)
        break

      case 'invoice.payment_failed':
        await handleSubscriptionPaymentFailed(event.data.object, payload)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, payload)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, payload)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, payload)
        break

      case 'charge.updated':
        log.info(
          { chargeId: event.data.object.id, status: event.data.object.status },
          'Charge updated',
        )
        break

      case 'charge.succeeded':
        log.info({ chargeId: event.data.object.id }, 'Charge succeeded')
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, payload, stripe)
        break

      case 'payment_intent.created':
        log.info({ paymentIntentId: event.data.object.id }, 'Payment intent created')
        break

      case 'customer.updated':
        log.info({ customerId: event.data.object.id }, 'Customer updated')
        break

      default:
        log.warn({ eventType: event.type }, 'Unhandled event type')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    log.error({ err: error }, 'Error processing webhook')
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: any, payload: any, stripe: any) {
  log.info({ paymentIntentId: paymentIntent.id }, 'Payment succeeded')

  // Template purchase branch (spec D.4) — productKind === 'template' was
  // pushed to PI metadata via payment_intent_data in /api/payments/template-checkout.
  if (paymentIntent?.metadata?.productKind === 'template') {
    // Dormant since 2026-08-19 — templates are free. Still honoured so a real
    // in-flight payment is never silently dropped.
    log.warn({ paymentIntentId: paymentIntent.id }, 'template purchase webhook fired after templates went free')
    await handleTemplatePurchase(paymentIntent, payload)
    return
  }

  const { courseId, userId } = paymentIntent.metadata

  if (!courseId || !userId) {
    if (paymentIntent?.metadata?.checkoutMode === 'guest') {
      log.info(
        { paymentIntentId: paymentIntent.id },
        'payment_intent.succeeded for guest checkout handled in checkout.session.completed',
      )
      return
    }

    log.error({ paymentIntentId: paymentIntent.id }, 'Missing metadata in payment intent')
    return
  }

  // Convert string metadata to proper types for PayloadCMS
  const userIdInt = parseInt(userId, 10)
  const courseIdInt = parseInt(courseId, 10)

  if (isNaN(userIdInt) || isNaN(courseIdInt)) {
    log.error({ userId, courseId }, 'Invalid user or course ID in payment intent metadata')
    return
  }

  try {
    // Find order by payment intent ID
    const orders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntent.id },
      },
      limit: 1,
    })

    if (orders.docs.length > 0) {
      const order = orders.docs[0]
      log.info({ orderId: order.id, paymentIntentId: paymentIntent.id }, 'Found order for payment intent')

      const paymentIntentId = paymentIntent.id
      let chargeId: string | null = null
      let receiptUrl: string | null = null
      let paymentMethodType: string | null = paymentIntent.payment_method_types?.[0] || null
      let paymentMethodDetails: any = null

      if (typeof paymentIntent.latest_charge === 'string') {
        chargeId = paymentIntent.latest_charge
      } else if (
        paymentIntent.charges?.data &&
        Array.isArray(paymentIntent.charges.data) &&
        paymentIntent.charges.data.length > 0
      ) {
        chargeId = paymentIntent.charges.data[0].id
      }

      if (chargeId) {
        try {
          const charge = await stripe.charges.retrieve(chargeId)
          receiptUrl = charge.receipt_url ?? null
          paymentMethodType =
            charge.payment_method_details?.type || paymentMethodType || null
          paymentMethodDetails = charge.payment_method_details
        } catch (chargeError) {
          log.error({ err: chargeError, chargeId }, 'Unable to retrieve charge while handling payment intent')
        }
      }

      // Update order status
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'completed',
          paidAt: new Date().toISOString(),
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: chargeId,
          receiptUrl,
          paymentMethod: paymentMethodType,
          paymentMethodDetails: paymentMethodDetails
            ? JSON.parse(JSON.stringify(paymentMethodDetails))
            : null,
        },
      })

      // Check for existing enrollment
      const existingEnrollment = await payload.find({
        collection: 'enrollments',
        where: {
          and: [{ user: { equals: userIdInt } }, { course: { equals: courseIdInt } }],
        },
        limit: 1,
      })

      if (existingEnrollment.docs.length === 0) {
        // Create enrollment
        const enrollment = await payload.create({
          collection: 'enrollments',
          data: {
            user: userIdInt,
            course: courseIdInt,
            status: 'active',
            enrolledAt: new Date().toISOString(),
            order: order.id,
          },
        })
        log.info({ enrollmentId: enrollment.id }, 'Enrollment created')
      }

      log.info(
        { paymentIntentId: paymentIntent.id },
        'Order updated and enrollment processed for payment',
      )
    } else {
      log.error({ paymentIntentId: paymentIntent.id }, 'No order found for payment intent')
    }
  } catch (error) {
    log.error({ err: error }, 'Error handling payment success')
  }
}

async function handlePaymentFailed(paymentIntent: any, payload: any) {
  log.info({ paymentIntentId: paymentIntent.id }, 'Payment failed')

  try {
    // Update order status
    const orders = await payload.find({
      collection: 'orders',
      where: {
        stripePaymentIntentId: { equals: paymentIntent.id },
      },
      limit: 1,
    })

    if (orders.docs.length > 0) {
      const order = orders.docs[0]
      await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'failed',
          failedAt: new Date().toISOString(),
        },
      })

      log.info({ paymentIntentId: paymentIntent.id }, 'Order marked as failed for payment')
    }
  } catch (error) {
    log.error({ err: error }, 'Error handling payment failure')
  }
}

async function handleSubscriptionPaymentSucceeded(invoice: any, _payload: any) {
  log.info({ invoiceId: invoice.id }, 'Subscription payment succeeded')
  // Handle subscription payment success
}

async function handleSubscriptionPaymentFailed(invoice: any, _payload: any) {
  log.info({ invoiceId: invoice.id }, 'Subscription payment failed')
  // Handle subscription payment failure
}

/**
 * Vinakademin Premium webhook handlers.
 *
 * Stripe is the source of truth for subscription state. We mirror status onto
 * the User row so /provningsmallar gating + `viewerIsMember` are O(1) reads.
 * All updates are idempotent — Stripe retries are safe.
 */

const VINAKADEMIN_PRODUCT_KEY = 'vinakademin_premium'

/** Map Stripe subscription.status onto our Users.subscriptionStatus enum. */
function mapStripeStatusToUserStatus(
  stripeStatus: string,
): 'active' | 'free_trial' | 'past_due' | 'canceled' | 'none' {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'free_trial'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'canceled'
    default:
      return 'none'
  }
}

function mapStripeStatusToUserRole(stripeStatus: string): 'subscriber' | 'user' {
  // Keep access during grace periods (past_due). Lose it on cancel/unpaid.
  if (
    stripeStatus === 'active' ||
    stripeStatus === 'trialing' ||
    stripeStatus === 'past_due'
  ) {
    return 'subscriber'
  }
  return 'user'
}

/**
 * Look up the user this subscription belongs to. Prefer the metadata.userId
 * stamped at checkout time; fall back to matching by stripeCustomerId then
 * by customer email if needed.
 */
async function resolveSubscriptionUser(
  subscription: any,
  payload: any,
): Promise<{ id: number; role?: string | null } | null> {
  const metadataUserId = Number(subscription?.metadata?.userId)
  if (Number.isInteger(metadataUserId)) {
    try {
      const u = await payload.findByID({
        collection: 'users',
        id: metadataUserId,
        overrideAccess: true,
      })
      if (u) return u
    } catch {
      // fall through
    }
  }
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id
  if (customerId) {
    const byCustomer = await payload.find({
      collection: 'users',
      where: { stripeCustomerId: { equals: customerId } },
      limit: 1,
      overrideAccess: true,
    })
    if (byCustomer.docs.length > 0) return byCustomer.docs[0]
  }
  return null
}

/**
 * Check whether a subscription is the Vinakademin Premium product. We tag
 * both the subscription metadata AND the price metadata in setup-stripe-
 * premium, but other subscription kinds (future products) may live on the
 * same Stripe account — this guard keeps us from clobbering unrelated rows.
 */
function isPremiumSubscription(subscription: any): boolean {
  if (subscription?.metadata?.kind === VINAKADEMIN_PRODUCT_KEY) return true
  const items = subscription?.items?.data ?? []
  for (const item of items) {
    const md = item?.price?.metadata?.kind
    if (md === VINAKADEMIN_PRODUCT_KEY) return true
  }
  return false
}

async function syncSubscriptionToUser(subscription: any, payload: any) {
  if (!isPremiumSubscription(subscription)) {
    log.info(
      { subscriptionId: subscription.id, status: subscription.status },
      'subscription_skipped_not_premium',
    )
    return
  }
  const user = await resolveSubscriptionUser(subscription, payload)
  if (!user) {
    log.warn(
      { subscriptionId: subscription.id, customer: subscription.customer },
      'subscription_no_matching_user',
    )
    return
  }
  const stripeStatus: string = subscription.status
  const nextStatus = mapStripeStatusToUserStatus(stripeStatus)
  const nextRole = mapStripeStatusToUserRole(stripeStatus)
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id
  const planFromInterval =
    subscription?.items?.data?.[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'
  const expiryTs = subscription.current_period_end as number | undefined
  const subscriptionExpiry =
    typeof expiryTs === 'number' ? new Date(expiryTs * 1000).toISOString() : undefined

  // Don't downgrade an admin — admin role is editorial, not subscription-driven.
  const data: Record<string, unknown> = {
    subscriptionStatus: nextStatus,
    subscriptionPlan: nextStatus === 'canceled' || nextStatus === 'none' ? 'none' : planFromInterval,
  }
  if (subscriptionExpiry) data.subscriptionExpiry = subscriptionExpiry
  if (customerId) data.stripeCustomerId = customerId
  if (user.role !== 'admin') {
    data.role = nextRole
  }

  await payload.update({
    collection: 'users',
    id: user.id,
    data: data as never,
    overrideAccess: true,
  })
  log.info(
    {
      subscriptionId: subscription.id,
      userId: user.id,
      stripeStatus,
      nextStatus,
      nextRole,
    },
    'subscription_user_synced',
  )

  // First-activation welcome email — sent once per user, gated on
  // `welcomeEmailSentAt`. Don't fire on past_due / canceled / none.
  const isFirstActivation =
    (nextStatus === 'active' || nextStatus === 'free_trial') &&
    !(user as any).welcomeEmailSentAt
  if (isFirstActivation && typeof (user as any).email === 'string' && (user as any).email) {
    const sent = await sendWelcomePremiumEmail({
      payload,
      to: (user as any).email,
      firstName: (user as any).firstName ?? null,
      plan: data.subscriptionPlan === 'annual' ? 'annual' : 'monthly',
      renewsOn: subscriptionExpiry ? new Date(subscriptionExpiry) : null,
    })
    if (sent) {
      try {
        await payload.update({
          collection: 'users',
          id: user.id,
          data: { welcomeEmailSentAt: new Date().toISOString() } as never,
          overrideAccess: true,
        })
      } catch (stampErr) {
        log.error(
          { err: stampErr, userId: user.id },
          'welcome_email_stamp_failed',
        )
      }
      await recordEvent({
        payload,
        type: 'enrollment_started',
        contactEmail: (user as any).email,
        label: 'Vinakademin+ aktiverat',
        userId: user.id,
        source: 'webhook',
        metadata: {
          subscriptionId: subscription.id,
          plan: data.subscriptionPlan,
          stripeStatus,
        },
      })
    }
  }
}

async function handleSubscriptionCreated(subscription: any, payload: any) {
  log.info({ subscriptionId: subscription.id }, 'Subscription created')
  await syncSubscriptionToUser(subscription, payload)
}

async function handleSubscriptionUpdated(subscription: any, payload: any) {
  log.info({ subscriptionId: subscription.id, status: subscription.status }, 'Subscription updated')
  await syncSubscriptionToUser(subscription, payload)
}

async function handleSubscriptionDeleted(subscription: any, payload: any) {
  log.info({ subscriptionId: subscription.id }, 'Subscription deleted')
  // Stripe sends status='canceled' on the deleted subscription — same path.
  await syncSubscriptionToUser({ ...subscription, status: 'canceled' }, payload)
}

const getCheckoutEmail = (session: any): string | null => {
  const metadataEmail = String(session?.metadata?.guestEmail || session?.metadata?.userEmail || '').trim()
  const customerEmail = String(session?.customer_details?.email || session?.customer_email || '').trim()
  const email = metadataEmail || customerEmail
  return email ? email.toLowerCase() : null
}

const resolveCheckoutUser = async (payload: any, session: any) => {
  const checkoutMode =
    session?.metadata?.checkoutMode === 'guest' ? 'guest' : 'authenticated'

  const metadataUserId = parseInt(String(session?.metadata?.userId || ''), 10)
  if (checkoutMode === 'authenticated' && !isNaN(metadataUserId)) {
    try {
      const existingUser = await payload.findByID({
        collection: 'users',
        id: metadataUserId,
      })

      if (existingUser) {
        return {
          checkoutMode,
          user: existingUser,
          isNewUser: false,
          email: String(existingUser.email || '').toLowerCase(),
        }
      }
    } catch (error) {
      log.warn({ err: error, userId: metadataUserId }, 'Could not load authenticated checkout user by id')
    }
  }

  const email = getCheckoutEmail(session)
  if (!email) {
    throw new Error('Checkout session is missing a usable customer email')
  }

  const existingUsers = await payload.find({
    collection: 'users',
    where: {
      email: { equals: email },
    },
    limit: 1,
  })

  if (existingUsers.docs.length > 0) {
    return {
      checkoutMode,
      user: existingUsers.docs[0],
      isNewUser: false,
      email,
    }
  }

  const guestFirstName = String(session?.metadata?.guestFirstName || '').trim()
  const guestLastName = String(session?.metadata?.guestLastName || '').trim()
  const randomPassword = crypto.randomBytes(24).toString('hex')

  const createdUser = await payload.create({
    collection: 'users',
    data: {
      email,
      password: randomPassword,
      firstName: guestFirstName || undefined,
      lastName: guestLastName || undefined,
      role: 'user',
      accountStatus: 'active',
      _verified: true,
      onboarding: {
        source: 'guest_checkout',
      },
    } as any,
  })

  log.info({ userId: createdUser.id, email }, 'Created guest checkout user')

  return {
    checkoutMode,
    user: createdUser,
    isNewUser: true,
    email,
  }
}

async function handleCheckoutSessionCompleted(session: any, payload: any, stripe: any) {
  log.info({ sessionId: session.id, metadata: session.metadata }, 'Checkout session completed')

  const courseId = session?.metadata?.courseId
  const courseIdInt = parseInt(String(courseId || ''), 10)
  if (!courseId || isNaN(courseIdInt)) {
    log.error(
      { sessionId: session.id, courseId },
      'Missing or invalid course metadata in checkout session',
    )
    return
  }

  try {
    let hydratedSession = session
    try {
      hydratedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['discounts', 'discounts.promotion_code'],
      })
    } catch (sessionError) {
      log.error({ err: sessionError }, 'Unable to hydrate checkout session discounts')
    }

    const resolvedCheckout = await resolveCheckoutUser(payload, session)
    const userIdInt = parseInt(String(resolvedCheckout.user.id), 10)
    if (isNaN(userIdInt)) {
      throw new Error(`Resolved user id is invalid: ${resolvedCheckout.user.id}`)
    }

    const course = await payload.findByID({
      collection: 'vinkurser',
      id: courseIdInt,
    })

    const ordersBySession = await payload.find({
      collection: 'orders',
      where: {
        stripeSessionId: { equals: session.id },
      },
      limit: 1,
    })
    const existingOrder = ordersBySession.docs[0] || null
    const wasAlreadyCompleted = existingOrder?.status === 'completed'

    let paymentIntentId: string | null = null
    let chargeId: string | null = null
    let receiptUrl: string | null = null
    let paymentMethodType: string | null = hydratedSession.payment_method_types?.[0] || null
    let paymentMethodDetails: any = null
    const amountTotal = Number(hydratedSession.amount_total || 0) / 100
    const amountSubtotal = Number(hydratedSession.amount_subtotal || hydratedSession.amount_total || 0) / 100
    const discountAmount = Number(hydratedSession.total_details?.amount_discount || 0) / 100
    const appliedDiscount = Array.isArray(hydratedSession.discounts)
      ? hydratedSession.discounts[0]
      : null
    const discountCode =
      appliedDiscount?.promotion_code &&
      typeof appliedDiscount.promotion_code === 'object' &&
      'code' in appliedDiscount.promotion_code
        ? String(appliedDiscount.promotion_code.code)
        : null

    if (hydratedSession.payment_intent) {
      paymentIntentId =
        typeof hydratedSession.payment_intent === 'string'
          ? hydratedSession.payment_intent
          : hydratedSession.payment_intent.id
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
          expand: ['latest_charge'],
        })
        if (typeof paymentIntent.latest_charge === 'string') {
          chargeId = paymentIntent.latest_charge
        } else if (paymentIntent.latest_charge?.id) {
          chargeId = paymentIntent.latest_charge.id
        }

        if (chargeId) {
          const charge =
            typeof paymentIntent.latest_charge === 'object' && paymentIntent.latest_charge?.id
              ? paymentIntent.latest_charge
              : await stripe.charges.retrieve(chargeId)

          receiptUrl = charge?.receipt_url ?? null
          paymentMethodType = charge?.payment_method_details?.type || paymentMethodType || null
          paymentMethodDetails = charge?.payment_method_details ?? null
        }
      } catch (intentError) {
        log.error({ err: intentError }, 'Unable to enrich payment details from Payment Intent')
      }
    }

    const orderPayload = {
      status: 'completed',
      paidAt: new Date().toISOString(),
      user: userIdInt,
      items: [
        {
          course: courseIdInt,
          price: amountTotal,
          quantity: 1,
        },
      ],
      amount: amountTotal,
      currency: String(hydratedSession.currency || 'sek').toUpperCase(),
      discountAmount,
      discountCode,
      stripeSessionId: hydratedSession.id,
      stripeCustomerId: String(hydratedSession.customer || ''),
      paymentMethod: paymentMethodType,
      paymentMethodDetails: paymentMethodDetails ? JSON.parse(JSON.stringify(paymentMethodDetails)) : null,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId: chargeId,
      receiptUrl,
      metadata: {
        ...(existingOrder?.metadata || {}),
        checkoutOrigin: resolvedCheckout.checkoutMode,
        guestEmail: resolvedCheckout.checkoutMode === 'guest' ? resolvedCheckout.email : null,
        amountSubtotal,
      },
    }

    const updatedOrder = existingOrder
      ? await payload.update({
          collection: 'orders',
          id: existingOrder.id,
          data: orderPayload,
        })
      : await payload.create({
          collection: 'orders',
          data: {
            orderNumber: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user: userIdInt,
            status: 'completed',
            items: [
              {
                course: courseIdInt,
                price: amountTotal,
                quantity: 1,
              },
            ],
            amount: amountTotal,
            currency: String(hydratedSession.currency || 'sek').toUpperCase(),
            discountAmount,
            discountCode,
            stripeSessionId: hydratedSession.id,
            stripeCustomerId: String(hydratedSession.customer || ''),
            paymentMethod: paymentMethodType,
            paymentMethodDetails: paymentMethodDetails ? JSON.parse(JSON.stringify(paymentMethodDetails)) : null,
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: chargeId,
            receiptUrl,
            paidAt: new Date().toISOString(),
            metadata: {
              checkoutOrigin: resolvedCheckout.checkoutMode,
              guestEmail: resolvedCheckout.checkoutMode === 'guest' ? resolvedCheckout.email : null,
              amountSubtotal,
            },
          },
        })

    const existingEnrollment = await payload.find({
      collection: 'enrollments',
      where: {
        and: [{ user: { equals: userIdInt } }, { course: { equals: courseIdInt } }],
      },
      limit: 1,
    })

    if (existingEnrollment.docs.length === 0) {
      await payload.create({
        collection: 'enrollments',
        data: {
          user: userIdInt,
          course: courseIdInt,
          status: 'active',
          enrolledAt: new Date().toISOString(),
          order: updatedOrder.id,
        },
      })
      log.info({ userId: userIdInt, courseId: courseIdInt }, 'User enrolled in course')
    }

    if (!wasAlreadyCompleted) {
      try {
        const { generateReceiptEmailHTML } = await import('@/lib/email-templates')
        const siteURL = getSiteURL()
        const claimAccessUrl =
          resolvedCheckout.checkoutMode === 'guest'
            ? `${siteURL}/aktivera-konto?email=${encodeURIComponent(resolvedCheckout.email)}&next=${encodeURIComponent('/mina-vinkurser')}`
            : undefined

        const emailHTML = generateReceiptEmailHTML({
          firstName: resolvedCheckout.user.firstName || undefined,
          courseTitle: course.title,
          courseSlug: course.slug || course.id.toString(),
          orderId: updatedOrder.id.toString(),
          amount: updatedOrder.amount || 0,
          discountAmount: updatedOrder.discountAmount || 0,
          discountCode: updatedOrder.discountCode || undefined,
          paidAt: updatedOrder.paidAt || new Date().toISOString(),
          receiptUrl: updatedOrder.receiptUrl || null,
          claimAccessUrl,
        })

        await payload.sendEmail({
          to: resolvedCheckout.email,
          subject: `Kvitto - ${course.title} - Vinakademin`,
          html: emailHTML,
        })

        // Internal heads-up to the team + CRM timeline event.
        // Fire-and-forget; never blocks the webhook.
        void (async () => {
          try {
            const team = buildOrderPaidEmail({
              orderId: updatedOrder.id,
              orderNumber: (updatedOrder as any).orderNumber,
              email: resolvedCheckout.email,
              customerName:
                [resolvedCheckout.user.firstName, resolvedCheckout.user.lastName]
                  .filter(Boolean)
                  .join(' ')
                  .trim() || undefined,
              courseTitle: course.title,
              amount: updatedOrder.amount || 0,
              currency: (updatedOrder as any).currency,
              discountAmount: updatedOrder.discountAmount || 0,
              discountCode: updatedOrder.discountCode || undefined,
              paidAt: updatedOrder.paidAt || new Date().toISOString(),
              checkoutMode: resolvedCheckout.checkoutMode,
              isNewUser: resolvedCheckout.isNewUser,
            })
            await sendTeamNotification({
              payload,
              subject: team.subject,
              html: team.html,
              replyTo: resolvedCheckout.email,
            })
          } catch (notifyErr) {
            log.error({ err: notifyErr }, 'order_paid_team_notify_failed')
          }

          await recordEvent({
            payload,
            type: 'order_paid',
            contactEmail: resolvedCheckout.email,
            label: `Köp: ${course.title}`,
            userId: userIdInt,
            source: 'webhook',
            metadata: {
              orderId: updatedOrder.id,
              orderNumber: (updatedOrder as any).orderNumber,
              courseId: courseIdInt,
              courseSlug: course.slug,
              amount: updatedOrder.amount,
              currency: (updatedOrder as any).currency,
              discountAmount: updatedOrder.discountAmount,
              discountCode: updatedOrder.discountCode,
              checkoutMode: resolvedCheckout.checkoutMode,
              isNewUser: resolvedCheckout.isNewUser,
              stripeSessionId: session.id,
            },
          })
        })()

        if (resolvedCheckout.checkoutMode === 'guest') {
          await payload.forgotPassword({
            collection: 'users',
            data: {
              email: resolvedCheckout.email,
            },
          })
          log.info(
            { event: 'account_claimed_email_sent', sessionId: session.id, userId: userIdInt, email: resolvedCheckout.email },
            'checkout_funnel',
          )
        }

        log.info(
          {
            event: 'checkout_completed',
            mode: resolvedCheckout.checkoutMode,
            sessionId: session.id,
            userId: userIdInt,
            courseId: courseIdInt,
            isNewUser: resolvedCheckout.isNewUser,
          },
          'checkout_funnel',
        )
      } catch (emailError) {
        log.error({ err: emailError }, 'Error sending receipt or claim email')
      }
    }
  } catch (error) {
    log.error({ err: error }, 'Error handling checkout session completion')

    // If it's a PayloadCMS validation error, log the details
    if (error && typeof error === 'object' && 'data' in error) {
      log.error({ errorData: (error as any).data }, 'PayloadCMS error data')
    }
  }
}

/**
 * Handle a template purchase payment_intent.succeeded. Creates a row in
 * TemplateEntitlements (idempotent on the (user, template) unique index).
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.4)
 */
async function handleTemplatePurchase(paymentIntent: any, payload: any) {
  const { templateId, userId } = paymentIntent.metadata || {}
  if (!templateId || !userId) {
    log.error(
      { paymentIntentId: paymentIntent.id },
      'Template payment_intent missing templateId or userId metadata',
    )
    return
  }

  const userIdInt = parseInt(String(userId), 10)
  const templateIdInt = parseInt(String(templateId), 10)
  if (isNaN(userIdInt) || isNaN(templateIdInt)) {
    log.error(
      { userId, templateId, paymentIntentId: paymentIntent.id },
      'Template payment_intent has non-numeric IDs',
    )
    return
  }

  try {
    // Idempotency: bail if entitlement already exists
    const existing = await payload.find({
      collection: 'template-entitlements',
      where: {
        and: [
          { user: { equals: userIdInt } },
          { template: { equals: templateIdInt } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })

    if (existing.totalDocs > 0) {
      // If it was refunded earlier and this is a fresh purchase, reactivate
      const doc = existing.docs[0]
      if (doc.status === 'refunded') {
        await payload.update({
          collection: 'template-entitlements',
          id: doc.id,
          data: {
            status: 'active',
            acquiredVia: 'purchase',
            payment: {
              amount: (paymentIntent.amount || 0) / 100,
              currency: paymentIntent.currency || 'sek',
              transactionId: paymentIntent.id,
              paidAt: new Date().toISOString(),
            },
          },
          overrideAccess: true,
        })
        log.info(
          { entitlementId: doc.id, userId, templateId },
          'Reactivated previously-refunded template entitlement',
        )
      } else {
        log.info(
          { entitlementId: doc.id, userId, templateId },
          'Template entitlement already exists, skipping create',
        )
      }
      return
    }

    const created = await payload.create({
      collection: 'template-entitlements',
      data: {
        user: userIdInt,
        template: templateIdInt,
        status: 'active',
        acquiredVia: 'purchase',
        acquiredAt: new Date().toISOString(),
        payment: {
          amount: (paymentIntent.amount || 0) / 100,
          currency: paymentIntent.currency || 'sek',
          transactionId: paymentIntent.id,
          paidAt: new Date().toISOString(),
        },
      },
      overrideAccess: true,
    })
    log.info({ entitlementId: created.id, userId, templateId }, 'Template entitlement created')
  } catch (err) {
    log.error({ err, userId, templateId }, 'Failed to create template entitlement')
  }
}

/**
 * Flip entitlements/enrollments to refunded when Stripe refunds a charge.
 * Looks up the original PaymentIntent's metadata to know whether to update a
 * TemplateEntitlements row or an Enrollment row.
 */
async function handleChargeRefunded(charge: any, payload: any, stripe: any) {
  const paymentIntentId = charge?.payment_intent
  if (!paymentIntentId) {
    log.info({ chargeId: charge?.id }, 'charge.refunded with no payment_intent — ignoring')
    return
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
    const md = pi?.metadata || {}

    if (md.productKind === 'template') {
      // Dormant since 2026-08-19 — templates are free. Still honoured so a real
      // in-flight payment is never silently dropped.
      log.warn({ paymentIntentId }, 'template purchase webhook fired after templates went free')
      const userIdInt = parseInt(String(md.userId || ''), 10)
      const templateIdInt = parseInt(String(md.templateId || ''), 10)
      if (isNaN(userIdInt) || isNaN(templateIdInt)) {
        log.error({ md }, 'charge.refunded for template — invalid IDs in metadata')
        return
      }
      const ents = await payload.find({
        collection: 'template-entitlements',
        where: {
          and: [
            { user: { equals: userIdInt } },
            { template: { equals: templateIdInt } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (ents.totalDocs > 0) {
        await payload.update({
          collection: 'template-entitlements',
          id: ents.docs[0].id,
          data: { status: 'refunded' },
          overrideAccess: true,
        })
        log.info(
          { entitlementId: ents.docs[0].id, paymentIntentId },
          'Template entitlement refunded',
        )
      } else {
        log.info({ paymentIntentId, md }, 'No template entitlement found for refunded charge')
      }
      return
    }

    // Course refund path — flip the matching Enrollment if we can find it.
    const courseIdInt = parseInt(String(md.courseId || ''), 10)
    const userIdInt = parseInt(String(md.userId || ''), 10)
    if (!isNaN(courseIdInt) && !isNaN(userIdInt)) {
      const enrolls = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { user: { equals: userIdInt } },
            { course: { equals: courseIdInt } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (enrolls.totalDocs > 0) {
        await payload.update({
          collection: 'enrollments',
          id: enrolls.docs[0].id,
          data: { status: 'cancelled' },
          overrideAccess: true,
        })
        log.info(
          { enrollmentId: enrolls.docs[0].id, paymentIntentId },
          'Course enrollment cancelled via refund',
        )
      }
    }
  } catch (err) {
    log.error({ err, chargeId: charge?.id, paymentIntentId }, 'Failed to process charge.refunded')
  }
}
