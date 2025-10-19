import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getStripeServer } from '@/lib/stripe'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att se kvitton' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { orderId } = await params

    // Fetch the order
    const order = await payload.findByID({
      collection: 'orders',
      id: orderId,
    })

    if (!order) {
      return NextResponse.json({ error: 'Order hittades inte' }, { status: 404 })
    }

    // Check if user owns this order or is admin
    if (order.user !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    // Get receipt URL from Stripe
    const stripe = getStripeServer()
    let receiptUrl = null

    try {
      if (order.stripeChargeId) {
        // If we have a charge ID, get the receipt URL from the charge
        const charge = await stripe.charges.retrieve(order.stripeChargeId)
        receiptUrl = charge.receipt_url
      } else if (order.stripeSessionId) {
        // If we have a session ID, get the payment intent and then the charge
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
        if (session.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent as string,
          )
          if (paymentIntent.latest_charge) {
            const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
            receiptUrl = charge.receipt_url
          }
        }
      }
    } catch (stripeError) {
      console.error('Error fetching receipt from Stripe:', stripeError)
      return NextResponse.json({ error: 'Kunde inte hämta kvitto från Stripe' }, { status: 500 })
    }

    if (!receiptUrl) {
      return NextResponse.json(
        { error: 'Inget kvitto tillgängligt för denna order' },
        { status: 404 },
      )
    }

    return NextResponse.json({ receiptUrl })
  } catch (error) {
    console.error('Error fetching receipt:', error)
    return NextResponse.json({ error: 'Ett fel uppstod vid hämtning av kvitto' }, { status: 500 })
  }
}
