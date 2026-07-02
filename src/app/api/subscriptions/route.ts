import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-subscriptions')

/**
 * POST /api/subscriptions
 *
 * PAUSED (2026-07-02): subscriptions are on hold — tasting templates are sold
 * as one-time purchases only. This endpoint previously created a Stripe
 * subscription + Payload record directly (without Checkout). Restore the
 * previous implementation from git history to re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'subscriptions_paused',
      message: 'Medlemskap är pausat. Provningsmallar köps som engångsköp.',
    },
    { status: 410 },
  )
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
    log.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid hämtning av prenumerationer' },
      { status: 500 },
    )
  }
}
