import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att se prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { userId } = await params

    // Check if user can access this data (own data or admin)
    if (userId !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    // Get user's current subscription
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [{ user: { equals: userId } }, { status: { equals: 'active' } }],
      },
      limit: 1,
      sort: '-createdAt',
    })

    const subscription = subscriptions.docs[0] || null

    return NextResponse.json({ subscription })
  } catch (error) {
    console.error('Error fetching user subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av prenumeration' },
      { status: 500 },
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att uppdatera prenumerationer' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { userId } = await params
    const { planId } = await request.json()

    // Check if user can access this data (own data or admin)
    if (userId !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    if (!planId) {
      return NextResponse.json({ error: 'Plan-ID krävs' }, { status: 400 })
    }

    // Get user's current subscription
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        and: [{ user: { equals: userId } }, { status: { equals: 'active' } }],
      },
      limit: 1,
    })

    if (subscriptions.docs.length === 0) {
      return NextResponse.json({ error: 'Ingen aktiv prenumeration hittades' }, { status: 404 })
    }

    const subscription = subscriptions.docs[0]

    // Update subscription plan
    const updatedSubscription = await payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        planId: planId as 'wine_club_monthly' | 'wine_club_yearly',
      },
    })

    return NextResponse.json({ subscription: updatedSubscription })
  } catch (error) {
    console.error('Error updating user subscription:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid uppdatering av prenumeration' },
      { status: 500 },
    )
  }
}
