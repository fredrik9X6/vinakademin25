import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import payload from 'payload'

// GET user courses
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params
    const { user } = await getUser()

    // Check if user is authenticated and authorized
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this profile (own profile or admin)
    if (user.id !== parseInt(userId) && user.role !== 'admin') {
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
      depth: 2, // Populate course relationship
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
      depth: 1,
      limit: 100,
    })

    // Map progress by course ID for easier lookup
    const progressMap = new Map()
    progressData.docs.forEach((progress: any) => {
      if (progress.course?.id) {
        progressMap.set(progress.course.id, progress)
      }
    })

    // Transform enrollments data to include progress
    const coursesWithProgress = enrollments.docs.map((enrollment: any) => {
      const course = enrollment.course
      const progress = progressMap.get(course?.id) || {
        progressPercentage: 0,
        status: 'not-started',
        timeSpent: 0,
      }

      return {
        id: course?.id,
        title: course?.title,
        slug: course?.slug,
        description: course?.description,
        thumbnail: course?.thumbnail,
        instructor: course?.instructor,
        enrollmentStatus: enrollment.status,
        enrollmentType: enrollment.enrollmentType,
        enrolledAt: enrollment.enrolledAt,
        progress: {
          percentage: progress.progressPercentage || 0,
          status: progress.status || 'not-started',
          timeSpent: progress.timeSpent || 0,
          lastAccessed: progress.lastAccessedAt,
        },
      }
    })

    return NextResponse.json({
      success: true,
      data: coursesWithProgress,
    })
  } catch (error) {
    console.error('Error fetching user courses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
