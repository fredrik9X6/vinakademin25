import type { Access, PayloadRequest } from 'payload'
import type { User } from '../payload-types'

// Use PayloadCMS v3 Access type for proper type safety
// This ensures all access functions conform to PayloadCMS v3 API

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
        collection: 'content-items',
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
 * Uses PayloadCMS v3 Access type for proper type safety
 */
export const courseContentAccess: Access = async ({ req }) => {
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
 * Uses PayloadCMS v3 Access type for proper type safety
 */
export const lessonAccess: Access = async ({ req }) => {
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
 * Uses PayloadCMS v3 Access type for proper type safety
 */
export const quizAccess: Access = async ({ req }) => {
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
      collection: 'content-items',
      id: lessonId,
    })

    if (!lesson) {
      return false
    }

    // Find the module that contains this content item
    const modules = await req.payload.find({
      collection: 'modules',
      where: {
        'contentItems.contentItem': { equals: lessonId },
      },
      limit: 1,
    })

    if (!modules.docs.length) {
      return false
    }

    const module = modules.docs[0]

    if (!module) {
      return false
    }

    // Find the vinprovning that contains this module
    const vinprovningar = await req.payload.find({
      collection: 'vinprovningar',
      where: {
        'modules.module': { equals: module.id },
      },
      limit: 1,
    })

    if (!vinprovningar.docs.length) {
      return false
    }

    const courseId = vinprovningar.docs[0].id

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
      collection: 'content-items',
      id: quizId,
    })

    if (!quiz) {
      return false
    }

    // Find the module that contains this content item
    const modules = await req.payload.find({
      collection: 'modules',
      where: {
        'contentItems.contentItem': { equals: quizId },
      },
      limit: 1,
    })

    if (!modules.docs.length) {
      return false
    }

    const module = modules.docs[0]

    // Find the vinprovning that contains this module
    const vinprovningar = await req.payload.find({
      collection: 'vinprovningar',
      where: {
        'modules.module': { equals: module.id },
      },
      limit: 1,
    })

    if (!vinprovningar.docs.length) {
      return false
    }

    const courseId = vinprovningar.docs[0].id

    // Check if user is enrolled and has quiz permissions
    const isEnrolled = await isEnrollmentValid(req, userId, String(courseId))
    if (!isEnrolled) {
      return false
    }

    // Check quiz taking permission
    return await hasPermission(req, userId, String(courseId), 'takeQuizzes')
  } catch (error) {
    console.error('Error checking quiz access:', error)
    return false
  }
}
