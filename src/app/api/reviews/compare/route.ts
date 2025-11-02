import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * GET /api/reviews/compare?sessionId=<sessionId>&lessonId=<lessonId>
 * Fetches all reviews for a given session and lesson for comparison
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')
    const lessonId = searchParams.get('lessonId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID is required' }, { status: 400 })
    }

    // Verify session exists and is active
    const session = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Check if the lesson has an answer key review
    const lesson = await payload.findByID({
      collection: 'content-items',
      id: lessonId,
      depth: 2,
    })

    if (!lesson || lesson.contentType !== 'lesson') {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Get the wine ID from the lesson's answer key review
    let wineId = null
    if (lesson.answerKeyReview) {
      const answerKeyReview =
        typeof lesson.answerKeyReview === 'object' ? lesson.answerKeyReview : null
      if (answerKeyReview?.wine) {
        wineId =
          typeof answerKeyReview.wine === 'object' ? answerKeyReview.wine.id : answerKeyReview.wine
      }
    }

    // Build query conditions
    const queryConditions: any[] = [
      {
        session: {
          equals: sessionId,
        },
      },
    ]

    // If we have a wine ID, include trusted reviews for that wine
    if (wineId) {
      queryConditions.push({
        wine: {
          equals: wineId,
        },
        isTrusted: {
          equals: true,
        },
      })
    }

    // Get all reviews for this lesson that are either:
    // 1. From participants in this session (guest reviews)
    // 2. Trusted reviews for the wine (answer keys)
    const reviews = await payload.find({
      collection: 'reviews',
      where: {
        or: queryConditions,
      },
      depth: 2, // Include wine, user, sessionParticipant details
      limit: 100,
    })

    // Get participant details for each review
    const reviewsWithParticipants = await Promise.all(
      reviews.docs.map(async (review) => {
        let participantName = 'Unknown'
        let isVerified = false

        if (review.isTrusted) {
          participantName = 'Vinakademins smaknotering'
          isVerified = true
        } else if (review.sessionParticipant) {
          try {
            const participant = await payload.findByID({
              collection: 'session-participants',
              id:
                typeof review.sessionParticipant === 'object'
                  ? review.sessionParticipant.id
                  : review.sessionParticipant,
            })
            participantName = participant.nickname || 'Guest'
          } catch {
            participantName = 'Guest'
          }
        } else if (review.user) {
          const user = typeof review.user === 'object' ? review.user : null
          if (user) {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
            participantName = fullName || user.email || 'User'
          } else {
            participantName = 'User'
          }
        }

        return {
          ...review,
          participantName,
          isVerified,
        }
      }),
    )

    return NextResponse.json({
      reviews: reviewsWithParticipants,
      sessionId,
      lessonId,
      totalReviews: reviews.totalDocs,
    })
  } catch (error) {
    console.error('Error fetching reviews for comparison:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
