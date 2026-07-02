import { NextResponse } from 'next/server'

/**
 * POST /api/subscriptions/checkout
 *
 * PAUSED (2026-07-02): subscriptions are on hold — tasting templates are sold
 * as one-time purchases only. This endpoint was the sole entry point for
 * creating new Stripe subscriptions; it now returns 410 Gone. Restore the
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
