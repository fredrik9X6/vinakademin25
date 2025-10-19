import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET user courses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await params
    const user = await getUser()

    // Check if user is authenticated and authorized
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this profile (own profile or admin)
    // Convert userId string to number for comparison since PayloadCMS uses numbers for IDs
    if (String(user.id) !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user enrollments
    const enrollments = await payload.find({
      collection: 'enrollments',
      where: {
        user: {
          equals: userId,
        },
      },
      depth: 3, // Populate course -> modules -> contents
      limit: 100,
    })

    // Get user progress for courses
    const progressData = await payload.find({
      collection: 'user-progress',
      where: {
        user: {
          equals: userId,
        },
      },
      depth: 0, // Don't populate relationships - we only need IDs
      limit: 100,
    })

    // Map progress by course ID for easier lookup
    // If there are multiple progress records for the same course, use the one with the most data
    const progressMap = new Map()
    progressData.docs.forEach((progress: any) => {
      // At depth 0, course is just an ID number, not an object
      const courseId = typeof progress.course === 'object' ? progress.course?.id : progress.course
      if (courseId) {
        const numericCourseId = Number(courseId)
        const existing = progressMap.get(numericCourseId)

        // If there's already a record, keep the one with more completed items
        if (existing) {
          const existingCount =
            (existing.completedLessons?.length || 0) +
            (existing.quizScores?.length || 0) +
            (existing.scores?.length || 0)
          const newCount =
            (progress.completedLessons?.length || 0) +
            (progress.quizScores?.length || 0) +
            (progress.scores?.length || 0)

          if (newCount > existingCount) {
            progressMap.set(numericCourseId, progress)
          }
        } else {
          progressMap.set(numericCourseId, progress)
        }
      }
    })

    // Combine enrollment and progress data
    const coursesWithProgress = await Promise.all(
      enrollments.docs.map(async (enrollment: any) => {
        const courseProgress = progressMap.get(enrollment.course.id)

        // Fetch modules separately to ensure we get all of them
        const modulesResult = await payload.find({
          collection: 'modules',
          where: {
            course: {
              equals: enrollment.course.id,
            },
          },
          depth: 1, // Populate contents
          limit: 1000,
        })

        // Calculate total items (lessons + quizzes + wine reviews) from modules
        let totalItems = 0
        if (modulesResult.docs && Array.isArray(modulesResult.docs)) {
          modulesResult.docs.forEach((module: any) => {
            // Modules use 'contents' array - count lesson-item, quiz-item, and wine-review-item
            if (typeof module === 'object' && module.contents && Array.isArray(module.contents)) {
              const itemCount = module.contents.filter(
                (item: any) =>
                  item.blockType === 'lesson-item' ||
                  item.blockType === 'quiz-item' ||
                  item.blockType === 'wine-review-item',
              ).length
              totalItems += itemCount
            }
          })
        }

        // Calculate completed items from progress
        const completedLessonsOnly = Array.isArray(courseProgress?.completedLessons)
          ? courseProgress.completedLessons.length
          : 0

        // Get completed (passed) quizzes from quizScores
        const completedQuizzes = Array.isArray(courseProgress?.quizScores)
          ? courseProgress.quizScores
              .filter((qs: any) => qs && qs.passed)
              .map((qs: any) => (typeof qs.quiz === 'object' ? qs.quiz.id : qs.quiz))
              .map((id: any) => Number(id))
          : []

        const completedItems = completedLessonsOnly + completedQuizzes.length

        // Recalculate progress percentage based on actual counts
        const recalculatedPercentage =
          totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

        return {
          ...enrollment,
          // Ensure we have access to course slug and other needed fields
          course: {
            ...enrollment.course,
            slug: enrollment.course.slug,
            totalLessons: totalItems,
          },
          progress: courseProgress
            ? {
                ...courseProgress,
                completedLessons: completedItems,
                progressPercentage: recalculatedPercentage, // Use recalculated percentage
              }
            : null,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      data: coursesWithProgress,
      total: enrollments.totalDocs,
    })
  } catch (error) {
    console.error('Error fetching user courses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
