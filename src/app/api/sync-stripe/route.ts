import { NextRequest, NextResponse } from 'next/server'
import { syncAllCoursesWithStripe } from '@/lib/stripe-products'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-sync-stripe')

export async function POST(request: NextRequest) {
  try {
    log.info('🔄 Syncing all courses with Stripe...')
    await syncAllCoursesWithStripe()
    log.info('✅ Successfully synced all courses with Stripe!')

    return NextResponse.json({
      success: true,
      message: 'Successfully synced all courses with Stripe',
    })
  } catch (error) {
    log.error('❌ Error syncing courses with Stripe:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
