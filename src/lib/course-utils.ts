/**
 * Course utility functions for counting items and managing course data
 */

interface CourseModule {
  id: number
  title: string
  order?: number
  contents?: Array<{
    blockType: string
    id?: string | number
    lesson?: any
    quiz?: any
    wineReview?: any
  }>
  lessons?: Array<{
    id: number
    order?: number
    [key: string]: any
  }>
  quizzes?: Array<{
    id: number
    [key: string]: any
  }>
}

/**
 * Count all content items in a module (lessons, quizzes, wine reviews)
 * Uses module.contents if available (drag & drop ordering), falls back to lessons array
 */
export function getTotalModuleItems(module: CourseModule): number {
  if (module.contents && Array.isArray(module.contents)) {
    // Only count lesson-item, quiz-item, and wine-review-item blocks
    return module.contents.filter(
      (item) =>
        item.blockType === 'lesson-item' ||
        item.blockType === 'quiz-item' ||
        item.blockType === 'wine-review-item',
    ).length
  }
  // Fallback to counting lessons if contents not available
  return (module.lessons?.length || 0) + (module.quizzes?.length || 0)
}

/**
 * Count total items across all modules in a course
 */
export function getTotalCourseItems(modules: CourseModule[]): number {
  return modules.reduce((total, module) => total + getTotalModuleItems(module), 0)
}

/**
 * Get flattened list of all items from modules in order
 * Returns array of {type, id, data} objects
 */
export function getFlattenedCourseItems(modules: CourseModule[]) {
  const items: Array<{ type: 'lesson' | 'quiz'; id: number; data: any }> = []

  // Sort modules by order
  const sortedModules = [...modules].sort((a, b) => (a.order || 0) - (b.order || 0))

  for (const module of sortedModules) {
    if (module.contents && Array.isArray(module.contents) && module.contents.length > 0) {
      // Use contents order if available
      for (const content of module.contents) {
        if (content.blockType === 'lesson-item' && content.lesson) {
          const lessonId = typeof content.lesson === 'object' ? content.lesson.id : content.lesson
          // Find the actual lesson object from module.lessons
          const lesson = module.lessons?.find((l) => l.id === lessonId)
          if (lesson) {
            items.push({ type: 'lesson', id: lesson.id, data: lesson })
          }
        } else if (content.blockType === 'quiz-item' && content.quiz) {
          const quizId = typeof content.quiz === 'object' ? content.quiz.id : content.quiz
          // Find the actual quiz object from module.quizzes
          const quiz = module.quizzes?.find((q) => q.id === quizId)
          if (quiz) {
            items.push({ type: 'quiz', id: quiz.id, data: quiz })
          }
        } else if (content.blockType === 'wine-review-item' && content.wineReview) {
          const wineReviewId =
            typeof content.wineReview === 'object' ? content.wineReview.id : content.wineReview
          // Wine reviews are tracked as lessons in completedLessons
          items.push({ type: 'lesson', id: wineReviewId, data: content.wineReview })
        }
      }
    } else {
      // Fallback: add lessons and quizzes sorted by order
      if (module.lessons) {
        const sortedLessons = [...module.lessons].sort((a, b) => (a.order || 0) - (b.order || 0))
        for (const lesson of sortedLessons) {
          items.push({ type: 'lesson', id: lesson.id, data: lesson })
        }
      }
      if (module.quizzes) {
        const sortedQuizzes = [...module.quizzes].sort(
          (a, b) => ((a as any).order || 0) - ((b as any).order || 0),
        )
        for (const quiz of sortedQuizzes) {
          items.push({ type: 'quiz', id: quiz.id, data: quiz })
        }
      }
    }
  }

  return items
}

/**
 * Determine if a lesson/item is free based on course settings
 * @param itemIndex - Index of the item in flattened course items (0-based)
 * @param freeItemCount - Number of free items set on course
 */
export function isItemFree(itemIndex: number, freeItemCount: number): boolean {
  return itemIndex < freeItemCount
}

/**
 * Mark lessons AND quizzes as free based on course.freeItemCount
 * Modifies lessons and quizzes in place to add isFree property
 */
export function markFreeLessons(modules: CourseModule[], freeItemCount: number): CourseModule[] {
  // First, initialize all lessons and quizzes as not free
  for (const module of modules) {
    if (module.lessons) {
      for (const lesson of module.lessons) {
        lesson.isFree = false
      }
    }
    if (module.quizzes) {
      for (const quiz of module.quizzes) {
        ;(quiz as any).isFree = false
      }
    }
  }

  // Then mark the first X ITEMS as free (counting ALL items: lessons AND quizzes)
  const flatItems = getFlattenedCourseItems(modules)

  flatItems.forEach((item, index) => {
    const isFree = index < freeItemCount
    if (item.data) {
      item.data.isFree = isFree
    }
  })

  return modules
}

/**
 * Count how many items (lessons AND quizzes) are marked as free
 */
export function countFreeItems(modules: CourseModule[]): number {
  let count = 0

  for (const module of modules) {
    if (module.lessons) {
      count += module.lessons.filter((l) => l.isFree).length
    }
    if (module.quizzes) {
      count += module.quizzes.filter((q) => (q as any).isFree).length
    }
  }

  return count
}
