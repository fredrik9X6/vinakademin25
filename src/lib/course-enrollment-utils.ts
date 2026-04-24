/**
 * Shared utilities for course enrollment data transformation and display.
 * Used by both the CoursePurchasePanel and Mina Provningar dashboard.
 */

export interface TransformedCourse {
  id: string | number
  slug: string
  title: string
  shortDescription: string
  level: string
  featuredImage: { url?: string; alt?: string } | null
  instructor: { firstName?: string; lastName?: string }
  purchaseDate: string
  price: number
  access: 'active' | 'pending' | 'expired'
  progress: {
    percentage: number
    completedLessons: number
    totalLessons: number
    lastAccessed: string | null
    completed: boolean
    certificateAvailable: boolean
  }
}

/** Maps API enrollment response to flat course object */
export function transformEnrollmentData(enrollment: any): TransformedCourse {
  const course = enrollment.course || {}
  const progress = enrollment.progress || {}

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.description || course.shortDescription || '',
    level: course.level || 'beginner',
    featuredImage: course.featuredImage,
    instructor: course.instructor || { firstName: '', lastName: 'Vinakademin' },
    purchaseDate: enrollment.enrolledAt || enrollment.createdAt,
    price: course.price || 0,
    access: enrollment.status === 'active' ? 'active' : 'pending',
    progress: {
      percentage: progress.progressPercentage || 0,
      completedLessons: Array.isArray(progress.completedLessons)
        ? progress.completedLessons.length
        : progress.completedLessons || 0,
      totalLessons: course.totalLessons || 0,
      lastAccessed: progress.lastAccessedAt || null,
      completed: progress.status === 'completed',
      certificateAvailable: progress.status === 'completed',
    },
  }
}

/** Swedish level label */
export function getLevelText(level: string): string {
  switch (level) {
    case 'beginner':
      return 'Nyborjare'
    case 'intermediate':
      return 'Fortsattning'
    case 'advanced':
      return 'Avancerad'
    case 'expert':
      return 'Expert'
    default:
      return level
  }
}

/** Badge color class for course level */
export function getLevelColor(level: string): string {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800'
    case 'intermediate':
      return 'bg-blue-100 text-blue-800'
    case 'advanced':
      return 'bg-orange-100 text-orange-800'
    case 'expert':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/** Swedish access status label */
export function getAccessStatusText(access: string): string {
  switch (access) {
    case 'active':
      return 'Aktiv'
    case 'expired':
      return 'Utgangen'
    case 'pending':
      return 'Vantande'
    default:
      return access
  }
}

/** Badge color class for access status */
export function getAccessStatusColor(access: string): string {
  switch (access) {
    case 'active':
      return 'bg-green-100 text-green-800'
    case 'expired':
      return 'bg-red-100 text-red-800'
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/** Format date to Swedish locale */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('sv-SE')
}

/** Format price in SEK */
export function formatPrice(amount: number): string {
  return `${amount} SEK`
}
