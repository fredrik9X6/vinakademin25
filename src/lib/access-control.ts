import type { PayloadRequest } from 'payload'
import type { User } from '../payload-types'

/**
 * Check if a user is enrolled in a course with active status
 */
export const isEnrolledInCourse = async (
  req: PayloadRequest,
  userId: string,
  courseId: string,
): Promise<boolean> => {
  try {
    const enrollment = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: userId } },
          { course: { equals: courseId } },
          { status: { equals: 'active' } },
        ],
      },
      limit: 1,
    })

    return enrollment.totalDocs > 0
  } catch (error) {
    console.error('Error checking enrollment:', error)
    return false
  }
}

/**
 * Check if a user has specific permissions for a course
 */
export const hasPermission = async (
  req: PayloadRequest,
  userId: string,
  courseId: string,
  permission: string,
): Promise<boolean> => {
  try {
    const enrollment = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: userId } },
          { course: { equals: courseId } },
          { status: { equals: 'active' } },
        ],
      },
      limit: 1,
    })

    if (enrollment.totalDocs === 0) {
      return false
    }

    const enrollmentDoc = enrollment.docs[0]
    const permissions = enrollmentDoc.permissions || {}

    switch (permission) {
      case 'viewContent':
        return permissions.canViewContent !== false
      case 'takeQuizzes':
        return permissions.canTakeQuizzes !== false
      case 'downloadFiles':
        return permissions.canDownloadFiles !== false
      case 'postComments':
        return permissions.canPostComments !== false
      case 'viewGrades':
        return permissions.canViewGrades !== false
      case 'receiveCertificate':
        return permissions.canReceiveCertificate !== false
      default:
        return false
    }
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Check if a user has preview access to a course
 */
export const hasPreviewAccess = async (
  req: PayloadRequest,
  userId: string,
  courseId: string,
): Promise<boolean> => {
  try {
    // Check if user has active enrollment
    const isEnrolled = await isEnrolledInCourse(req, userId, courseId)
    if (isEnrolled) {
      return true
    }

    // Check if user has preview-only access
    const previewEnrollment = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: userId } },
          { course: { equals: courseId } },
          { accessLevel: { equals: 'preview' } },
        ],
      },
      limit: 1,
    })

    return previewEnrollment.totalDocs > 0
  } catch (error) {
    console.error('Error checking preview access:', error)
    return false
  }
}

/**
 * Check if a course allows free preview lessons
 */
export const hasFreePreviewAccess = async (
  req: PayloadRequest,
  courseId: string,
  lessonId?: string,
): Promise<boolean> => {
  try {
    // Check if specific lesson allows free preview
    if (lessonId) {
      const lesson = await req.payload.findByID({
        collection: 'lessons',
        id: lessonId,
      })

      return (lesson as any)?.isFree === true
    }

    // For now, return false if no lesson-specific check
    return false
  } catch (error) {
    console.error('Error checking free preview access:', error)
    return false
  }
}

/**
 * Access control function for course content
 */
export const courseContentAccess = async ({ req }: { req: PayloadRequest }) => {
  const { user } = req

  if (!user) {
    return false
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return true
  }

  // For regular users, they need to be enrolled in the course
  // This will be used in course-related collections
  return true // Will be overridden in specific collections with course-specific logic
}

/**
 * Access control function for lessons
 */
export const lessonAccess = async ({ req }: { req: PayloadRequest }) => {
  const { user } = req

  if (!user) {
    return false
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return true
  }

  // For regular users, check enrollment when accessing specific lessons
  // This will be implemented in the lesson collection access control
  return true
}

/**
 * Access control function for quizzes
 */
export const quizAccess = async ({ req }: { req: PayloadRequest }) => {
  const { user } = req

  if (!user) {
    return false
  }

  // Admin has access to everything
  if (user.role === 'admin') {
    return true
  }

  // For regular users, check enrollment and quiz permissions
  return true
}

/**
 * Check if enrollment is still valid (not expired)
 */
export const isEnrollmentValid = async (
  req: PayloadRequest,
  userId: string,
  courseId: string,
): Promise<boolean> => {
  try {
    const enrollment = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: userId } },
          { course: { equals: courseId } },
          { status: { in: ['active', 'completed'] } },
        ],
      },
      limit: 1,
    })

    if (enrollment.totalDocs === 0) {
      return false
    }

    const enrollmentDoc = enrollment.docs[0]

    // Check if enrollment has expired
    if (enrollmentDoc.expiresAt && new Date(enrollmentDoc.expiresAt) < new Date()) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking enrollment validity:', error)
    return false
  }
}

/**
 * Get user's access level for a course
 */
export const getUserAccessLevel = async (
  req: PayloadRequest,
  userId: string,
  courseId: string,
): Promise<string> => {
  try {
    const enrollment = await req.payload.find({
      collection: 'enrollments',
      where: {
        and: [
          { user: { equals: userId } },
          { course: { equals: courseId } },
          { status: { in: ['active', 'completed'] } },
        ],
      },
      limit: 1,
    })

    if (enrollment.totalDocs === 0) {
      return 'none'
    }

    const enrollmentDoc = enrollment.docs[0]
    return enrollmentDoc.accessLevel || 'full'
  } catch (error) {
    console.error('Error getting user access level:', error)
    return 'none'
  }
}

/**
 * Check if user can access a specific lesson
 */
export const canAccessLesson = async (
  req: PayloadRequest,
  userId: string,
  lessonId: string,
): Promise<boolean> => {
  try {
    const lesson = await req.payload.findByID({
      collection: 'lessons',
      id: lessonId,
    })

    if (!lesson) {
      return false
    }

    // Get the course through module relationship
    const lessonModuleId =
      lesson.module != null
        ? typeof lesson.module === 'object'
          ? lesson.module.id
          : lesson.module
        : null

    if (!lessonModuleId) {
      return false
    }

    const module = await req.payload.findByID({
      collection: 'modules',
      id: String(lessonModuleId),
    })

    if (!module) {
      return false
    }

    const courseId =
      module.course != null
        ? typeof module.course === 'object'
          ? module.course.id
          : module.course
        : null

    if (!courseId) {
      return false
    }

    // Check if lesson allows free preview
    if ((lesson as any)?.isFree) {
      return true
    }

    // Check if user is enrolled and has content access
    const isEnrolled = await isEnrollmentValid(req, userId, String(courseId))
    if (!isEnrolled) {
      return false
    }

    // Check content viewing permission
    return await hasPermission(req, userId, String(courseId), 'viewContent')
  } catch (error) {
    console.error('Error checking lesson access:', error)
    return false
  }
}

/**
 * Check if user can take a specific quiz
 */
export const canTakeQuiz = async (
  req: PayloadRequest,
  userId: string,
  quizId: string,
): Promise<boolean> => {
  try {
    const quiz = await req.payload.findByID({
      collection: 'quizzes',
      id: quizId,
    })

    if (!quiz) {
      return false
    }

    const quizCourseId =
      quiz.course != null
        ? typeof quiz.course === 'object'
          ? quiz.course.id
          : quiz.course
        : null

    if (!quizCourseId) {
      return false
    }

    const courseId = String(quizCourseId)

    // Check if user is enrolled and has quiz permissions
    const isEnrolled = await isEnrollmentValid(req, userId, courseId)
    if (!isEnrolled) {
      return false
    }

    // Check quiz taking permission
    return await hasPermission(req, userId, courseId, 'takeQuizzes')
  } catch (error) {
    console.error('Error checking quiz access:', error)
    return false
  }
}
