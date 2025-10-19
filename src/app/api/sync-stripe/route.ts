import { NextRequest, NextResponse } from 'next/server'
import { syncAllCoursesWithStripe } from '@/lib/stripe-products'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Syncing all courses with Stripe...')
    await syncAllCoursesWithStripe()
    console.log('✅ Successfully synced all courses with Stripe!')

    return NextResponse.json({
      success: true,
      message: 'Successfully synced all courses with Stripe',
    })
  } catch (error) {
    console.error('❌ Error syncing courses with Stripe:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
