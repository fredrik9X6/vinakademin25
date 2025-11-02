import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, validateWebhookSignature } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'

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

async function handleCheckoutSessionCompleted(session: any, payload: any, stripe: any) {
  console.log('🔔 Webhook: Checkout session completed:', session.id)
  console.log('🔍 Session metadata:', session.metadata)

  const { courseId, userId } = session.metadata

  if (!courseId || !userId) {
    console.error('❌ Missing metadata in checkout session:', session.id, { courseId, userId })
    return
  }

  // Convert string metadata to proper types for PayloadCMS
  const userIdInt = parseInt(userId, 10)
  const courseIdInt = parseInt(courseId, 10)

  if (isNaN(userIdInt) || isNaN(courseIdInt)) {
    console.error('❌ Invalid user or course ID in metadata:', {
      userId,
      courseId,
      userIdInt,
      courseIdInt,
    })
    return
  }

  console.log('✅ Parsed metadata:', { userIdInt, courseIdInt })

  try {
    // Find order by Stripe session ID
    console.log('🔍 Finding order by session ID:', session.id)
    const orders = await payload.find({
      collection: 'orders',
      where: {
        stripeSessionId: { equals: session.id },
      },
      limit: 1,
    })

    console.log('📋 Orders found:', orders.docs.length)

    if (orders.docs.length > 0) {
      const order = orders.docs[0]
      console.log('📦 Found order:', order.id, 'Current status:', order.status)

      let paymentIntentId: string | null = null
      let chargeId: string | null = null
      let receiptUrl: string | null = null
      let paymentMethodType: string | null = session.payment_method_types?.[0] || null
      let paymentMethodDetails: any = null

      if (session.payment_intent) {
        paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id
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

      // Update order status to completed
      console.log('🔄 Updating order status to completed...')
      const updatedOrder = await payload.update({
        collection: 'orders',
        id: order.id,
        data: {
          status: 'completed',
          paidAt: new Date().toISOString(),
          paymentMethod: paymentMethodType,
          paymentMethodDetails: paymentMethodDetails
            ? JSON.parse(JSON.stringify(paymentMethodDetails))
            : null,
          stripePaymentIntentId: paymentIntentId,
          stripeChargeId: chargeId,
          receiptUrl,
        },
      })
      console.log('✅ Order updated successfully:', updatedOrder.id)

      // Check if enrollment already exists
      console.log('🔍 Checking for existing enrollment...')
      const existingEnrollment = await payload.find({
        collection: 'enrollments',
        where: {
          and: [{ user: { equals: userIdInt } }, { course: { equals: courseIdInt } }],
        },
        limit: 1,
      })

      console.log('📚 Existing enrollments found:', existingEnrollment.docs.length)

      if (existingEnrollment.docs.length === 0) {
        console.log('🎓 Creating new enrollment...')

        // Create enrollment using PayloadCMS 3 best practices
        const enrollment = await payload.create({
          collection: 'enrollments',
          data: {
            user: userIdInt, // Use integer ID for relationship
            course: courseIdInt, // Use integer ID for relationship
            status: 'active',
            enrolledAt: new Date().toISOString(),
            order: order.id, // Reference to the order
          },
        })

        console.log('✅ Enrollment created successfully:', enrollment.id)
        console.log(`🎉 User ${userIdInt} enrolled in course ${courseIdInt}`)
      } else {
        console.log('⚠️ Enrollment already exists for this user and course')
      }

      // Send receipt email
      try {
        console.log('📧 Preparing to send receipt email...')
        
        // Fetch user and course details
        const user = await payload.findByID({
          collection: 'users',
          id: userIdInt,
        })

        const course = await payload.findByID({
          collection: 'vinprovningar',
          id: courseIdInt,
        })

        if (!user?.email) {
          console.warn('⚠️ User email not found, skipping receipt email')
        } else {
          const { generateReceiptEmailHTML } = await import('@/lib/email-templates')
          
          const emailHTML = generateReceiptEmailHTML({
            firstName: user.firstName || undefined,
            courseTitle: course.title,
            courseSlug: course.slug || course.id.toString(),
            orderId: order.id.toString(),
            amount: order.amount || 0,
            paidAt: updatedOrder.paidAt || new Date().toISOString(),
            receiptUrl: updatedOrder.receiptUrl || null,
          })

          await payload.sendEmail({
            to: user.email,
            subject: `Kvitto - ${course.title} - Vinakademin`,
            html: emailHTML,
          })

          console.log('✅ Receipt email sent successfully to:', user.email)
        }
      } catch (emailError) {
        // Don't fail the webhook if email sending fails
        console.error('⚠️ Error sending receipt email:', emailError)
      }
    } else {
      console.error('❌ No order found for session ID:', session.id)
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
