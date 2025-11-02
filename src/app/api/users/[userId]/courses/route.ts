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
      depth: 2, // Populate course -> modules -> module relationship
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
        const course = enrollment.course

        // Get module IDs from course's modules array
        const courseModules = (course as any).modules || []
        const moduleIds = courseModules
          .map((cm: any) => {
            const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
            return moduleId
          })
          .filter(Boolean)

        // Fetch modules by their IDs
        let modulesResult: any = { docs: [] }
        if (moduleIds.length > 0) {
          modulesResult = await payload.find({
            collection: 'modules',
            where: {
              id: { in: moduleIds },
            },
            limit: 1000,
            depth: 2, // Populate contentItems.contentItem
          })
        }

        // Calculate total items (lessons + quizzes) from modules' contentItems array
        let totalItems = 0
        if (modulesResult.docs && Array.isArray(modulesResult.docs)) {
          modulesResult.docs.forEach((module: any) => {
            // Modules use 'contentItems' array - count lessons and quizzes
            if (
              typeof module === 'object' &&
              module.contentItems &&
              Array.isArray(module.contentItems)
            ) {
              totalItems += module.contentItems.length
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
            ...course,
            slug: course.slug,
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
