import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

/**
 * POST /api/reviews
 * Create a new wine review
 *
 * This custom route ensures proper authentication with Next.js App Router
 */
export async function POST(request: NextRequest) {
  console.log('🍷 [REVIEWS API] POST request received')

  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    // Get cookie string and verify user
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    console.log('👤 [REVIEWS API] Authenticated user:', user?.id, user?.email)

    if (!user) {
      console.log('❌ [REVIEWS API] Not authenticated')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 [REVIEWS API] Request body:', {
      lesson: body.lesson,
      wine: body.wine,
      session: body.session,
      sessionParticipant: body.sessionParticipant,
    })

    // Check if a review already exists for this user/lesson/wine combination
    const whereConditions: any = {
      and: [
        { user: { equals: user.id } },
        { lesson: { equals: body.lesson } },
        { wine: { equals: body.wine } },
      ],
    }

    // If this is a session review, also match the session
    if (body.session) {
      whereConditions.and.push({ session: { equals: body.session } })
    }

    const existingReviews = await payload.find({
      collection: 'reviews',
      where: whereConditions,
      limit: 1,
    })

    let review

    if (existingReviews.totalDocs > 0) {
      // Update existing review
      const existingReview = existingReviews.docs[0]
      console.log('🔄 [REVIEWS API] Updating existing review:', existingReview.id)

      review = await payload.update({
        collection: 'reviews',
        id: existingReview.id,
        data: {
          ...body,
          user: user.id, // Explicitly set the user
        },
        req: {
          ...request,
          user, // Pass the authenticated user
          payload,
        } as any,
      })

      console.log('✅ [REVIEWS API] Review updated:', review.id)
    } else {
      // Create new review
      console.log('📝 [REVIEWS API] Creating new review')

      review = await payload.create({
        collection: 'reviews',
        data: {
          ...body,
          user: user.id, // Explicitly set the user
        },
        req: {
          ...request,
          user, // Pass the authenticated user
          payload,
        } as any,
      })

      console.log('✅ [REVIEWS API] Review created:', review.id)
    }

    return NextResponse.json(
      {
        success: true,
        doc: review,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('❌ [REVIEWS API] Error creating review:', error)
    return NextResponse.json(
      {
        error: 'Failed to create review',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/reviews
 * Query wine reviews with filters
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    // Get cookie string and verify user (optional for GET)
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    // Build where query from search params
    const where: any = {}

    if (searchParams.get('lesson')) {
      where.lesson = { equals: Number(searchParams.get('lesson')) }
    }

    if (searchParams.get('wine')) {
      where.wine = { equals: Number(searchParams.get('wine')) }
    }

    if (searchParams.get('user')) {
      where.user = { equals: Number(searchParams.get('user')) }
    }

    if (searchParams.get('session')) {
      where.session = { equals: Number(searchParams.get('session')) }
    }

    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

    const reviews = await payload.find({
      collection: 'reviews',
      where: Object.keys(where).length > 0 ? where : undefined,
      limit,
      page,
      sort: '-createdAt',
      req: {
        ...request,
        user, // Pass user for access control
        payload,
      } as any,
    })

    return NextResponse.json(reviews, { status: 200 })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch reviews',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
