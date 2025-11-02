/**
 * Course utility functions for counting items and managing course data
 * Client-safe utilities only - no PayloadCMS imports
 */

import type { ContentItem } from '@/payload-types'

interface CourseModule {
  id: number
  title: string
  order?: number
  contentItems?: Array<{
    contentItem: number | ContentItem
    order: number
    isFree?: boolean
  }>
  contents?: Array<{
    blockType: string
    id?: string | number
    lesson?: any
    quiz?: any
    wineReview?: any
  }>
  lessons?: Array<{
    id: number
    contentType?: 'lesson' | 'quiz'
    order?: number
    isFree?: boolean
    [key: string]: any
  }>
  quizzes?: Array<{
    id: number
    contentType?: 'lesson' | 'quiz'
    isFree?: boolean
    [key: string]: any
  }>
}

/**
 * Count all content items in a module (lessons and quizzes)
 * Uses module.contentItems if available, falls back to lessons/quizzes arrays
 */
export function getTotalModuleItems(module: CourseModule): number {
  if (module.contentItems && Array.isArray(module.contentItems)) {
    return module.contentItems.length
  }
  // Fallback to counting lessons/quizzes if contentItems not available
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
 * Works with new contentItems structure
 */
export function getFlattenedCourseItems(modules: CourseModule[]) {
  const items: Array<{ type: 'lesson' | 'quiz'; id: number; data: any }> = []

  // Sort modules by order
  const sortedModules = [...modules].sort((a, b) => (a.order || 0) - (b.order || 0))

  for (const module of sortedModules) {
    if (module.contentItems && Array.isArray(module.contentItems) && module.contentItems.length > 0) {
      // Use contentItems order (new structure)
      const sortedContentItems = [...module.contentItems].sort((a, b) => (a.order || 0) - (b.order || 0))
      
      for (const ci of sortedContentItems) {
        const contentItem = typeof ci.contentItem === 'object' ? ci.contentItem : null
        if (!contentItem) continue

        const itemData = {
          ...contentItem,
          isFree: ci.isFree || false,
        }

        if (contentItem.contentType === 'lesson') {
          items.push({ type: 'lesson', id: contentItem.id, data: itemData })
        } else if (contentItem.contentType === 'quiz') {
          items.push({ type: 'quiz', id: contentItem.id, data: itemData })
        }
      }
    } else if (module.contents && Array.isArray(module.contents) && module.contents.length > 0) {
      // Fallback: Use contents order (old structure for backward compatibility)
      for (const content of module.contents) {
        if (content.blockType === 'lesson-item' && content.lesson) {
          const lessonId = typeof content.lesson === 'object' ? content.lesson.id : content.lesson
          const lesson = module.lessons?.find((l) => l.id === lessonId)
          if (lesson) {
            items.push({ type: 'lesson', id: lesson.id, data: lesson })
          }
        } else if (content.blockType === 'quiz-item' && content.quiz) {
          const quizId = typeof content.quiz === 'object' ? content.quiz.id : content.quiz
          const quiz = module.quizzes?.find((q) => q.id === quizId)
          if (quiz) {
            items.push({ type: 'quiz', id: quiz.id, data: quiz })
          }
        } else if (content.blockType === 'wine-review-item' && content.wineReview) {
          const wineReviewId =
            typeof content.wineReview === 'object' ? content.wineReview.id : content.wineReview
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
 * Count how many items (lessons AND quizzes) are marked as free
 */
export function countFreeItems(modules: CourseModule[]): number {
  let count = 0

  for (const module of modules) {
    // Count free items from contentItems (new structure)
    if (module.contentItems && Array.isArray(module.contentItems)) {
      count += module.contentItems.filter((ci) => ci.isFree).length
    } else {
      // Fallback: count from lessons/quizzes arrays
      if (module.lessons) {
        count += module.lessons.filter((l) => l.isFree).length
      }
      if (module.quizzes) {
        count += module.quizzes.filter((q) => (q as any).isFree).length
      }
    }
  }

  return count
}
