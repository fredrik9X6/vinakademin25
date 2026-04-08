import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const getPgErrorDetails = (error: unknown) => {
  if (!isObject(error)) return null

  return {
    code: typeof error.code === 'string' ? error.code : undefined,
    message: typeof error.message === 'string' ? error.message : undefined,
    detail: typeof error.detail === 'string' ? error.detail : undefined,
    hint: typeof error.hint === 'string' ? error.hint : undefined,
    table: typeof error.table === 'string' ? error.table : undefined,
    column: typeof error.column === 'string' ? error.column : undefined,
    constraint: typeof error.constraint === 'string' ? error.constraint : undefined,
  }
}

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })

  try {
    const { courseId, rating, content, token } = await req.json()
    const parsedCourseId = Number(courseId)
    const parsedRating = Number(rating)
    const reviewContent = typeof content === 'string' ? content.trim() : ''

    if (!parsedCourseId || !parsedRating || !reviewContent) {
      return NextResponse.json(
        { error: 'Betyg och recensionstext krävs' },
        { status: 400 },
      )
    }

    if (parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json({ error: 'Betyg måste vara 1-5' }, { status: 400 })
    }

    // Determine the author - either via auth token or review email token
    let authorId: number | null = null
    let isVerifiedPurchase = false

    // Try authenticated user first
    const user = await getUser()
    if (user) {
      authorId = user.id

      // Check if user has an enrollment for this course (verified purchase)
      const enrollment = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { user: { equals: user.id } },
            { course: { equals: parsedCourseId } },
          ],
        },
        limit: 1,
      })
      isVerifiedPurchase = enrollment.docs.length > 0
    }

    // If no authenticated user but token provided, validate the token
    if (!authorId && token) {
      const enrollment = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { course: { equals: parsedCourseId } },
            { 'reviewTracking.reviewEmailToken': { equals: token } },
          ],
        },
        limit: 1,
        depth: 1,
      })

      if (enrollment.docs.length > 0) {
        const enrollmentDoc = enrollment.docs[0]
        authorId =
          typeof enrollmentDoc.user === 'object'
            ? (enrollmentDoc.user as any).id
            : enrollmentDoc.user
        isVerifiedPurchase = true
      }
    }

    if (!authorId) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad eller ha en giltig recensionslänk' },
        { status: 401 },
      )
    }

    // Check if user already has a review for this course
    const existingReview = await payload.find({
      collection: 'course-reviews',
      where: {
        and: [
          { author: { equals: authorId } },
          { course: { equals: parsedCourseId } },
        ],
      },
      limit: 1,
    })

    if (existingReview.docs.length > 0) {
      return NextResponse.json(
        { error: 'Du har redan skrivit en recension för denna vinprovning' },
        { status: 409 },
      )
    }

    // Create the review
    const review = await payload.create({
      collection: 'course-reviews',
      data: {
        // Fallback title avoids DB errors if auto-title hook cannot resolve course title.
        title: `Recension ${new Date().toISOString()}`,
        course: parsedCourseId,
        author: authorId,
        rating: parsedRating,
        content: reviewContent,
        status: 'published',
        isVerifiedPurchase,
        reviewToken: token || undefined,
      },
    })

    // So the review-request cron never treats this enrollment as needing an email
    try {
      const enrollmentList = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { user: { equals: authorId } },
            { course: { equals: parsedCourseId } },
          ],
        },
        limit: 1,
      })
      const enr = enrollmentList.docs[0] as
        | { id: string | number; reviewTracking?: { reviewEmailSentAt?: string } }
        | undefined
      if (enr && !enr.reviewTracking?.reviewEmailSentAt) {
        await payload.update({
          collection: 'enrollments',
          id: enr.id,
          data: {
            reviewTracking: {
              ...(enr as { reviewTracking?: Record<string, unknown> }).reviewTracking,
              reviewEmailSentAt: new Date().toISOString(),
            },
          } as any,
        })
      }
    } catch (enrollErr) {
      payload.logger.warn(
        `Could not set reviewEmailSentAt on enrollment after review create: ${String(enrollErr)}`,
      )
    }

    return NextResponse.json({ success: true, review: { id: review.id } })
  } catch (error) {
    const pgError = getPgErrorDetails(error)
    const formattedDetails = pgError
      ? `code=${pgError.code || 'n/a'} message=${pgError.message || 'n/a'} detail=${pgError.detail || 'n/a'} table=${pgError.table || 'n/a'} column=${pgError.column || 'n/a'} constraint=${pgError.constraint || 'n/a'}`
      : String(error)

    payload.logger.error(`Error creating course review: ${formattedDetails}`)
    console.error('Error creating course review:', error)

    if (pgError?.code === '42703') {
      return NextResponse.json(
        {
          error:
            'Databasschemat för recensioner är inte uppdaterat. Lägg till saknade kolumner i Neon och försök igen.',
        },
        { status: 500 },
      )
    }

    if (pgError?.code === '22P02' || pgError?.message?.includes('invalid input syntax for type json')) {
      return NextResponse.json(
        {
          error:
            'Recensionsdata kunde inte sparas på grund av ett schemafel i databasen. Kontrollera kolumntyperna för course_reviews.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: 'Något gick fel, försök igen' },
      { status: 500 },
    )
  }
}

// GET reviews for a specific course
export async function GET(req: NextRequest) {
  const payload = await getPayload({ config })
  const url = new URL(req.url)
  const courseId = url.searchParams.get('courseId')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  try {
    const reviews = await payload.find({
      collection: 'course-reviews',
      where: {
        and: [
          { course: { equals: parseInt(courseId) } },
          { status: { equals: 'published' } },
        ],
      },
      depth: 1,
      sort: '-createdAt',
      limit: 50,
    })

    // Calculate average rating
    const ratings: number[] = reviews.docs
      .map((r: any) => r.rating as number)
      .filter((r: number) => r != null)
    const averageRating =
      ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0

    return NextResponse.json({
      reviews: reviews.docs.map((r: any) => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
        author: typeof r.author === 'object' ? {
          firstName: (r.author as any).firstName,
          lastName: (r.author as any).lastName,
        } : null,
      })),
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.totalDocs,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
  }
}
