import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, formatAmountForStripe, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCourseCheckoutData } from '@/lib/stripe-products'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-payments-create-payment-intent')

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const user = await getUser()
    log.info('Payment API: User retrieved:', user ? `ID: ${user.id}` : 'null')

    if (!user?.id) {
      log.info('Payment API: No user found, returning 401')
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att köpa vinprovningar' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { courseId, paymentMethod } = await request.json()
    log.info('Payment API: Request data:', { courseId, paymentMethod })

    if (!courseId) {
      log.info('Payment API: No courseId provided')
      return NextResponse.json({ error: 'Vinprovnings-ID krävs' }, { status: 400 })
    }

    // Fetch course data
    const course = await payload.findByID({
      collection: 'vinprovningar',
      id: courseId,
    })
    log.info(
      'Payment API: Course found:',
      course ? `ID: ${course.id}, Title: ${course.title}` : 'null',
    )

    if (!course) {
      log.info('Payment API: Course not found')
      return NextResponse.json({ error: 'Vinprovningen hittades inte' }, { status: 404 })
    }

    // Check if course has a price
    if (!course.price || course.price <= 0) {
      log.info('Payment API: Course has no price')
      return NextResponse.json({ error: 'Vinprovningen har inget pris' }, { status: 400 })
    }

    // Check if user already owns this course
    const existingEnrollment = await payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: user.id.toString() } },
          { course: { equals: courseId.toString() } },
        ],
      },
      limit: 1,
    })
    log.info(
      'Payment API: Existing enrollment check:',
      existingEnrollment.docs.length > 0 ? 'Found' : 'Not found',
    )

    if (existingEnrollment.docs.length > 0) {
      log.info('Payment API: User already owns course')
      return NextResponse.json({ error: 'Du äger redan denna vinprovning' }, { status: 400 })
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      user.email!,
      user.id.toString(),
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    )
    log.info('Payment API: Stripe customer:', customer.id)

    // Get course checkout data (Stripe product/price)
    const checkoutData = await getCourseCheckoutData(courseId)
    log.info('Payment API: Checkout data:', checkoutData ? 'Found' : 'Not found')

    if (!checkoutData) {
      log.info('Payment API: Course not configured for payment')
      return NextResponse.json(
        { error: 'Vinprovningen är inte konfigurerad för betalning' },
        { status: 400 },
      )
    }

    // Create payment intent
    const paymentIntentData: any = {
      amount: formatAmountForStripe(course.price),
      currency: 'sek',
      customer: customer.id,
      metadata: {
        courseId,
        courseTitle: course.title,
        userId: user.id.toString(),
        userEmail: user.email!,
      },
    }

    // Add specific payment method configuration
    if (paymentMethod === 'klarna') {
      paymentIntentData.payment_method_types = ['klarna']
      paymentIntentData.payment_method_options = {
        klarna: {
          preferred_locale: 'sv-SE',
        },
      }
    } else {
      // Card payment - use automatic payment methods for better UX
      paymentIntentData.automatic_payment_methods = {
        enabled: true,
      }
    }

    const stripe = getStripeServer()
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData)
    log.info('Payment API: Payment intent created:', paymentIntent.id)

    // Create order record in PayloadCMS (orderNumber will be auto-generated)
    log.info('Payment API: Creating order with data:', {
      user: user.id.toString(),
      courseId: courseId.toString(),
      amount: course.price,
    })

    try {
      const order = await payload.create({
        collection: 'orders',
        data: {
          orderNumber: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          user: user.id,
          status: 'pending',
          items: [
            {
              course: courseId,
              price: course.price,
              quantity: 1,
            },
          ],
          amount: course.price,
          currency: 'sek',
          stripePaymentIntentId: paymentIntent.id,
          stripeCustomerId: customer.id,
          paymentMethod: paymentMethod,
        },
      })
      log.info('Payment API: Order created successfully:', order.id)
    } catch (orderError) {
      log.error('Payment API: Order creation failed:', orderError)
      log.error('Payment API: Order creation error details:', {
        message: orderError instanceof Error ? orderError.message : 'Unknown error',
        data: (orderError as any)?.data || 'No data',
        cause: (orderError as any)?.cause || 'No cause',
      })
      // Don't throw the error - continue with payment intent even if order creation fails
      log.info('Payment API: Continuing with payment intent despite order creation failure')
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })
  } catch (error) {
    log.error('Payment API: Error creating payment intent:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av betalning' },
      { status: 500 },
    )
  }
}
