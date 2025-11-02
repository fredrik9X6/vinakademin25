import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { getSiteURL } from '@/lib/site-url'

export async function POST(request: NextRequest) {
  try {
    // Get user using PayloadCMS 3 pattern
    const user = await getUser()
    console.log('Checkout Session API: User retrieved:', user ? `ID: ${user.id}` : 'null')

    if (!user?.id) {
      console.log('Checkout Session API: No user found, returning 401')
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att köpa vinprovningar' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { courseId } = await request.json()
    console.log('Checkout Session API: Request data:', { courseId })

    if (!courseId) {
      console.log('Checkout Session API: No courseId provided')
      return NextResponse.json({ error: 'Vinprovnings-ID krävs' }, { status: 400 })
    }

    // Fetch course data using PayloadCMS 3 API
    const course = await payload.findByID({
      collection: 'vinprovningar',
      id: courseId,
    })
    console.log(
      'Checkout Session API: Course found:',
      course ? `ID: ${course.id}, Title: ${course.title}` : 'null',
    )

    if (!course) {
      console.log('Checkout Session API: Course not found')
      return NextResponse.json({ error: 'Vinprovningen hittades inte' }, { status: 404 })
    }

    // Check if course has a price
    if (!course.price || course.price <= 0) {
      console.log('Checkout Session API: Course has no price')
      return NextResponse.json({ error: 'Vinprovningen har inget pris' }, { status: 400 })
    }

    // Check if user already owns this course
    const existingEnrollment = await payload.find({
      collection: 'enrollments',
      where: {
        and: [{ user: { equals: user.id } }, { course: { equals: courseId } }],
      },
      limit: 1,
    })
    console.log(
      'Checkout Session API: Existing enrollment check:',
      existingEnrollment.docs.length > 0 ? 'Found' : 'Not found',
    )

    if (existingEnrollment.docs.length > 0) {
      console.log('Checkout Session API: User already owns course')
      return NextResponse.json({ error: 'Du äger redan denna vinprovning' }, { status: 400 })
    }

    // Get or create Stripe customer
    const customer = await getOrCreateStripeCustomer(
      user.email!,
      user.id.toString(),
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    )
    console.log('Checkout Session API: Stripe customer:', customer.id)

    // Create Stripe Checkout Session
    const stripe = getStripeServer()
    const baseUrl = getSiteURL()

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'klarna'],
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: course.title,
              description: course.description || `Vinprovning: ${course.title}`,
              images:
                course.featuredImage &&
                typeof course.featuredImage === 'object' &&
                course.featuredImage.url
                  ? [
                      course.featuredImage.url.startsWith('http')
                        ? course.featuredImage.url
                        : `${baseUrl}${course.featuredImage.url}`,
                    ]
                  : [],
              metadata: {
                courseId: courseId.toString(),
                type: 'course',
              },
            },
            unit_amount: Math.round(course.price * 100), // Convert to öre
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vinprovningar/${course.slug}?checkout=cancelled`,
      metadata: {
        courseId: courseId.toString(),
        courseTitle: course.title,
        userId: user.id.toString(),
        userEmail: user.email!,
      },
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: 'auto',
      // No shipping address needed for digital products
      phone_number_collection: {
        enabled: false,
      },
      consent_collection: {
        terms_of_service: 'required',
      },
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
    })

    console.log('Checkout Session API: Session created:', session.id)

    // Create order record in PayloadCMS for tracking
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
          stripeSessionId: session.id,
          stripeCustomerId: customer.id,
          paymentMethod: null, // Will be determined after payment
        },
      })
      console.log('Checkout Session API: Order created successfully:', order.id)
    } catch (orderError) {
      console.error('Checkout Session API: Order creation failed:', orderError)
      // Continue anyway - the session is created and webhook will handle completion
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Checkout Session API: Error creating checkout session:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av betalning' },
      { status: 500 },
    )
  }
}
