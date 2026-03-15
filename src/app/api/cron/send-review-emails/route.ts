import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'
import { generateReviewRequestEmailHTML } from '@/lib/email-templates'

/**
 * Cron endpoint: sends review request emails to users who reached 70% completion
 * 24+ hours ago but haven't received a review email yet.
 *
 * Can be called by an external scheduler (e.g. Railway cron, Vercel cron)
 * or manually via: POST /api/cron/send-review-emails
 *
 * Requires CRON_SECRET env var for authentication.
 */
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await getPayload({ config })

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Find enrollments where:
    // 1. reviewThresholdReachedAt is set (user hit 70%)
    // 2. reviewThresholdReachedAt is older than 24 hours
    // 3. reviewEmailSentAt is NOT set (email not yet sent)
    // 4. Enrollment is active or completed
    const enrollments = await payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { 'reviewTracking.reviewThresholdReachedAt': { exists: true } },
          { 'reviewTracking.reviewThresholdReachedAt': { less_than: twentyFourHoursAgo } },
          { 'reviewTracking.reviewEmailSentAt': { exists: false } },
          {
            or: [{ status: { equals: 'active' } }, { status: { equals: 'completed' } }],
          },
        ],
      },
      depth: 2, // Populate user and course
      limit: 50, // Process in batches
    })

    let sentCount = 0
    let errorCount = 0

    for (const enrollment of enrollments.docs) {
      try {
        const user = typeof enrollment.user === 'object' ? enrollment.user : null
        const course = typeof enrollment.course === 'object' ? enrollment.course : null

        if (!user || !course) {
          payload.logger.warn(`Skipping enrollment ${enrollment.id}: missing user or course data`)
          continue
        }

        // Check if user already has a review for this course
        const existingReview = await payload.find({
          collection: 'course-reviews',
          where: {
            and: [
              { author: { equals: user.id } },
              { course: { equals: course.id } },
            ],
          },
          limit: 1,
        })

        if (existingReview.docs.length > 0) {
          // User already reviewed - mark as sent so we don't check again
          await payload.update({
            collection: 'enrollments',
            id: enrollment.id,
            data: {
              reviewTracking: {
                ...enrollment.reviewTracking,
                reviewEmailSentAt: new Date().toISOString(),
              },
            } as any,
          })
          continue
        }

        // Generate review token
        const reviewToken = crypto.randomBytes(32).toString('hex')

        // Send review request email
        const emailHTML = generateReviewRequestEmailHTML({
          firstName: (user as any).firstName,
          courseTitle: (course as any).title,
          courseSlug: (course as any).slug,
          reviewToken,
        })

        await payload.sendEmail({
          to: (user as any).email,
          subject: `Hur var ${(course as any).title}? Vi vill gärna höra vad du tyckte!`,
          html: emailHTML,
        })

        // Update enrollment to mark email as sent
        await payload.update({
          collection: 'enrollments',
          id: enrollment.id,
          data: {
            reviewTracking: {
              ...enrollment.reviewTracking,
              reviewEmailSentAt: new Date().toISOString(),
              reviewEmailToken: reviewToken,
            },
          } as any,
        })

        sentCount++
        payload.logger.info(
          `Review request email sent to ${(user as any).email} for course ${(course as any).title}`,
        )
      } catch (error) {
        errorCount++
        payload.logger.error(`Error sending review email for enrollment ${enrollment.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      processed: enrollments.docs.length,
      sent: sentCount,
      errors: errorCount,
    })
  } catch (error) {
    payload.logger.error('Error in send-review-emails cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support GET for Vercel Cron
export async function GET(req: NextRequest) {
  return POST(req)
}
