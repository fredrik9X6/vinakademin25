import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent_id')
    const orderId = searchParams.get('order_id')

    if (!paymentIntentId && !orderId) {
      return NextResponse.json({ error: 'Payment intent ID eller order ID krävs' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    let order
    if (orderId) {
      // Get order by ID
      order = await payload.findByID({
        collection: 'orders',
        id: orderId,
      })

      // Check if user owns this order
      const orderUserId = typeof order.user === 'object' ? order.user.id : order.user
      if (orderUserId.toString() !== user.id.toString()) {
        return NextResponse.json(
          { error: 'Du har inte behörighet att se denna order' },
          { status: 403 },
        )
      }
    } else {
      // Get order by payment intent ID
      const orders = await payload.find({
        collection: 'orders',
        where: {
          stripePaymentIntentId: { equals: paymentIntentId },
        },
        limit: 1,
      })

      if (orders.docs.length === 0) {
        return NextResponse.json({ error: 'Order hittades inte' }, { status: 404 })
      }

      order = orders.docs[0]

      // Check if user owns this order
      const orderUserId = typeof order.user === 'object' ? order.user.id : order.user
      if (orderUserId.toString() !== user.id.toString()) {
        return NextResponse.json(
          { error: 'Du har inte behörighet att se denna order' },
          { status: 403 },
        )
      }
    }

    // Get course details
    const courseId =
      typeof order.items[0].course === 'object' ? order.items[0].course.id : order.items[0].course
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
    })

    // Check enrollment status
    const enrollment = await payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: user.id.toString() } },
          { course: { equals: courseId.toString() } },
        ],
      },
      limit: 1,
    })

    const isEnrolled = enrollment.docs.length > 0

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        failedAt: order.failedAt,
        paymentMethod: order.paymentMethod,
      },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        featuredImage: course.featuredImage,
      },
      isEnrolled,
      enrollment: isEnrolled ? enrollment.docs[0] : null,
    })
  } catch (error) {
    console.error('Error checking payment status:', error)

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Ett fel uppstod vid kontroll av betalningsstatus' },
      { status: 500 },
    )
  }
}
