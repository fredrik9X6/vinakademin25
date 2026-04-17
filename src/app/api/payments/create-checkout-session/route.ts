import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { getSiteURL } from '@/lib/site-url'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const logCheckoutEvent = (event: string, details: Record<string, unknown>) => {
  console.log(`[checkout_funnel] ${event}`, details)
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    const payload = await getPayload({ config })
    const { courseId, guestEmail, guestFirstName, guestLastName } = await request.json()

    const checkoutMode: 'authenticated' | 'guest' = user?.id ? 'authenticated' : 'guest'

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

    let checkoutEmail = user?.email || ''
    let checkoutFirstName = user?.firstName || ''
    let checkoutLastName = user?.lastName || ''
    let existingUserByEmail: any = null

    if (checkoutMode === 'guest') {
      const normalizedEmail = String(guestEmail || '').trim().toLowerCase()
      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        return NextResponse.json({ error: 'Ange en giltig e-postadress för att fortsätta' }, { status: 400 })
      }

      checkoutEmail = normalizedEmail
      checkoutFirstName = String(guestFirstName || '').trim()
      checkoutLastName = String(guestLastName || '').trim()

      const existingUsers = await payload.find({
        collection: 'users',
        where: {
          email: { equals: normalizedEmail },
        },
        limit: 1,
      })
      existingUserByEmail = existingUsers.docs[0] || null
    }

    // Check if this user/email already owns this course
    if (user?.id || existingUserByEmail?.id) {
      const enrollmentUserId = user?.id || existingUserByEmail.id
      const existingEnrollment = await payload.find({
        collection: 'enrollments',
        where: {
          and: [{ user: { equals: enrollmentUserId } }, { course: { equals: courseId } }],
        },
        limit: 1,
      })

      if (existingEnrollment.docs.length > 0) {
        return NextResponse.json({ error: 'Du äger redan denna vinprovning' }, { status: 400 })
      }
    }

    const customer = await getOrCreateStripeCustomer(
      checkoutEmail,
      user?.id ? user.id.toString() : `guest:${checkoutEmail}`,
      `${checkoutFirstName} ${checkoutLastName}`.trim(),
    )

    logCheckoutEvent('checkout_started', {
      mode: checkoutMode,
      courseId: String(courseId),
      userId: user?.id || null,
      email: checkoutEmail,
    })

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
      allow_promotion_codes: true,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/vinprovningar/${course.slug}?checkout=cancelled`,
      metadata: {
        checkoutMode,
        courseId: courseId.toString(),
        courseTitle: course.title,
        userId: user?.id ? user.id.toString() : '',
        userEmail: user?.email || '',
        guestEmail: checkoutMode === 'guest' ? checkoutEmail : '',
        guestFirstName: checkoutMode === 'guest' ? checkoutFirstName : '',
        guestLastName: checkoutMode === 'guest' ? checkoutLastName : '',
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

    const orderUserId = user?.id || existingUserByEmail?.id
    try {
      if (orderUserId) {
        const order = await payload.create({
          collection: 'orders',
          data: {
            orderNumber: `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user: orderUserId,
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
            paymentMethod: null,
            metadata: {
              checkoutOrigin: checkoutMode,
              guestEmail: checkoutMode === 'guest' ? checkoutEmail : null,
            },
          },
        })
        console.log('Checkout Session API: Order created successfully:', order.id)
      } else {
        console.log('Checkout Session API: Skipping pre-order creation for guest checkout without known user')
      }
    } catch (orderError) {
      console.error('Checkout Session API: Order creation failed:', orderError)
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
