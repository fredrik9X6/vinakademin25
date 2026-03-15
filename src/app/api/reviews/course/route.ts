import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function POST(req: NextRequest) {
  const payload = await getPayload({ config })

  try {
    const { courseId, rating, content, token } = await req.json()

    if (!courseId || !rating || !content) {
      return NextResponse.json(
        { error: 'Betyg och recensionstext krävs' },
        { status: 400 },
      )
    }

    if (rating < 1 || rating > 5) {
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
            { course: { equals: courseId } },
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
            { course: { equals: courseId } },
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
          { course: { equals: courseId } },
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
        course: courseId,
        author: authorId,
        rating,
        content,
        status: 'published',
        isVerifiedPurchase,
        reviewToken: token || undefined,
      },
    })

    return NextResponse.json({ success: true, review: { id: review.id } })
  } catch (error: any) {
    payload.logger.error('Error creating course review:', error)
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
