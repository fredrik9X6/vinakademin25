import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, validateWebhookSignature } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { getSiteURL } from '@/lib/site-url'

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
    console.error('No Stripe signature found')
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
      console.warn('⚠️ Webhook signature verification failed (likely due to ngrok). Attempting to parse event anyway...')
      try {
        // Try to parse the event manually for development
        // Note: Stripe webhook events have structure: { type, data: { object: {...} } }
        const eventData = JSON.parse(bodyBuffer.toString('utf-8'))
        
        // Ensure event has the correct structure
        if (eventData && typeof eventData === 'object') {
          event = eventData
          console.warn(`⚠️ Bypassed signature verification for event type: ${event?.type || 'unknown'}`)
        } else {
          throw new Error('Invalid event structure')
        }
      } catch (parseError) {
        console.error('❌ Could not parse webhook body:', parseError)
        return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
      }
    } else {
      console.error('❌ Webhook signature verification failed:', errorMessage)
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
        // Log charge updates but don't need to process them
        console.log('💳 Charge updated:', event.data.object.id, 'Status:', event.data.object.status)
        break

      case 'charge.succeeded':
        // Charge succeeded - payment intent webhook handles the actual logic
        console.log('💳 Charge succeeded:', event.data.object.id)
        break

      case 'payment_intent.created':
        // Payment intent created - no action needed yet
        console.log('💳 Payment intent created:', event.data.object.id)
        break

      case 'customer.updated':
        // Customer updated - no action needed
        console.log('👤 Customer updated:', event.data.object.id)
        break

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: any, payload: any, stripe: any) {
  console.log('🔔 Webhook: Payment succeeded:', paymentIntent.id)

  const { courseId, userId } = paymentIntent.metadata

  if (!courseId || !userId) {
    if (paymentIntent?.metadata?.checkoutMode === 'guest') {
      console.log(
        'ℹ️ payment_intent.succeeded for guest checkout handled in checkout.session.completed:',
        paymentIntent.id,
      )
      return
    }

    console.error('❌ Missing metadata in payment intent:', paymentIntent.id)
    return
  }

  // Convert string metadata to proper types for PayloadCMS
  const userIdInt = parseInt(userId, 10)
  const courseIdInt = parseInt(courseId, 10)

  if (isNaN(userIdInt) || isNaN(courseIdInt)) {
    console.error('❌ Invalid user or course ID in payment intent metadata:', { userId, courseId })
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
      console.log('📦 Found order for payment intent:', order.id)

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
          console.error('⚠️ Unable to retrieve charge while handling payment intent:', chargeError)
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
        console.log('✅ Enrollment created:', enrollment.id)
      }

      console.log('✅ Order updated and enrollment processed for payment:', paymentIntent.id)
    } else {
      console.error('❌ No order found for payment intent:', paymentIntent.id)
    }
  } catch (error) {
    console.error('❌ Error handling payment success:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message)
    }
  }
}

async function handlePaymentFailed(paymentIntent: any, payload: any) {
  console.log('Payment failed:', paymentIntent.id)

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

      console.log('Order marked as failed for payment:', paymentIntent.id)
    }
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleSubscriptionPaymentSucceeded(invoice: any, payload: any) {
  console.log('Subscription payment succeeded:', invoice.id)
  // Handle subscription payment success
}

async function handleSubscriptionPaymentFailed(invoice: any, payload: any) {
  console.log('Subscription payment failed:', invoice.id)
  // Handle subscription payment failure
}

async function handleSubscriptionCreated(subscription: any, payload: any) {
  console.log('Subscription created:', subscription.id)
  // Handle subscription creation
}

async function handleSubscriptionUpdated(subscription: any, payload: any) {
  console.log('Subscription updated:', subscription.id)
  // Handle subscription updates
}

async function handleSubscriptionDeleted(subscription: any, payload: any) {
  console.log('Subscription deleted:', subscription.id)
  // Handle subscription deletion
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
      console.warn('⚠️ Could not load authenticated checkout user by id:', metadataUserId, error)
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

  console.log('✅ Created guest checkout user:', createdUser.id, email)

  return {
    checkoutMode,
    user: createdUser,
    isNewUser: true,
    email,
  }
}

async function handleCheckoutSessionCompleted(session: any, payload: any, stripe: any) {
  console.log('🔔 Webhook: Checkout session completed:', session.id)
  console.log('🔍 Session metadata:', session.metadata)

  const courseId = session?.metadata?.courseId
  const courseIdInt = parseInt(String(courseId || ''), 10)
  if (!courseId || isNaN(courseIdInt)) {
    console.error('❌ Missing or invalid course metadata in checkout session:', session.id, { courseId })
    return
  }

  try {
    const resolvedCheckout = await resolveCheckoutUser(payload, session)
    const userIdInt = parseInt(String(resolvedCheckout.user.id), 10)
    if (isNaN(userIdInt)) {
      throw new Error(`Resolved user id is invalid: ${resolvedCheckout.user.id}`)
    }

    const course = await payload.findByID({
      collection: 'vinprovningar',
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
    let paymentMethodType: string | null = session.payment_method_types?.[0] || null
    let paymentMethodDetails: any = null

    if (session.payment_intent) {
      paymentIntentId =
        typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id
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
        console.error('⚠️ Unable to enrich payment details from Payment Intent:', intentError)
      }
    }

    const orderPayload = {
      status: 'completed',
      paidAt: new Date().toISOString(),
      user: userIdInt,
      paymentMethod: paymentMethodType,
      paymentMethodDetails: paymentMethodDetails ? JSON.parse(JSON.stringify(paymentMethodDetails)) : null,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId: chargeId,
      receiptUrl,
      metadata: {
        ...(existingOrder?.metadata || {}),
        checkoutOrigin: resolvedCheckout.checkoutMode,
        guestEmail: resolvedCheckout.checkoutMode === 'guest' ? resolvedCheckout.email : null,
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
                price: Number(session.amount_total || 0) / 100,
                quantity: 1,
              },
            ],
            amount: Number(session.amount_total || 0) / 100,
            currency: String(session.currency || 'sek').toUpperCase(),
            stripeSessionId: session.id,
            stripeCustomerId: String(session.customer || ''),
            paymentMethod: paymentMethodType,
            paymentMethodDetails: paymentMethodDetails ? JSON.parse(JSON.stringify(paymentMethodDetails)) : null,
            stripePaymentIntentId: paymentIntentId,
            stripeChargeId: chargeId,
            receiptUrl,
            paidAt: new Date().toISOString(),
            metadata: {
              checkoutOrigin: resolvedCheckout.checkoutMode,
              guestEmail: resolvedCheckout.checkoutMode === 'guest' ? resolvedCheckout.email : null,
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
      console.log(`🎉 User ${userIdInt} enrolled in course ${courseIdInt}`)
    }

    if (!wasAlreadyCompleted) {
      try {
        const { generateReceiptEmailHTML } = await import('@/lib/email-templates')
        const siteURL = getSiteURL()
        const claimAccessUrl =
          resolvedCheckout.checkoutMode === 'guest'
            ? `${siteURL}/aktivera-konto?email=${encodeURIComponent(resolvedCheckout.email)}&next=${encodeURIComponent('/mina-provningar')}`
            : undefined

        const emailHTML = generateReceiptEmailHTML({
          firstName: resolvedCheckout.user.firstName || undefined,
          courseTitle: course.title,
          courseSlug: course.slug || course.id.toString(),
          orderId: updatedOrder.id.toString(),
          amount: updatedOrder.amount || 0,
          paidAt: updatedOrder.paidAt || new Date().toISOString(),
          receiptUrl: updatedOrder.receiptUrl || null,
          claimAccessUrl,
        })

        await payload.sendEmail({
          to: resolvedCheckout.email,
          subject: `Kvitto - ${course.title} - Vinakademin`,
          html: emailHTML,
        })

        if (resolvedCheckout.checkoutMode === 'guest') {
          await payload.forgotPassword({
            collection: 'users',
            data: {
              email: resolvedCheckout.email,
            },
          })
          console.log(`[checkout_funnel] account_claimed_email_sent`, {
            sessionId: session.id,
            userId: userIdInt,
            email: resolvedCheckout.email,
          })
        }

        console.log(`[checkout_funnel] checkout_completed`, {
          mode: resolvedCheckout.checkoutMode,
          sessionId: session.id,
          userId: userIdInt,
          courseId: courseIdInt,
          isNewUser: resolvedCheckout.isNewUser,
        })
      } catch (emailError) {
        console.error('⚠️ Error sending receipt or claim email:', emailError)
      }
    }
  } catch (error) {
    console.error('❌ Error handling checkout session completion:', error)

    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // If it's a PayloadCMS validation error, log the details
    if (error && typeof error === 'object' && 'data' in error) {
      console.error('PayloadCMS error data:', error.data)
    }
  }
}
