/**
 * Server-only course utility functions
 * These functions use PayloadCMS and should only be imported server-side
 */

import { getPayload } from 'payload'
import config from '@/payload.config'
import type { ContentItem } from '@/payload-types'

/**
 * Transform a course with modules populated from contentItems
 * This is a helper function to fetch modules and their content items
 * SERVER-ONLY: Uses PayloadCMS
 */
export async function transformCourseWithModules(course: any) {
  const payload = await getPayload({ config })

  // Get module IDs from course's modules array
  const courseModules = course.modules || []
  const moduleIds = courseModules
    .map((cm: any) => {
      const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
      return moduleId
    })
    .filter(Boolean)

  if (moduleIds.length === 0) {
    return {
      ...course,
      modules: [],
    }
  }

  // Fetch all modules with their contentItems populated
  const modulesResult = await payload.find({
    collection: 'modules',
    where: {
      id: { in: moduleIds },
    },
    limit: 1000,
    depth: 2, // Populate contentItems.contentItem
  })

  // Sort modules by their order in the course's modules array (array index IS the order)
  const modules = modulesResult.docs.sort((a, b) => {
    const aIndex = courseModules.findIndex((cm: any) => {
      const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
      return moduleId === a.id
    })
    const bIndex = courseModules.findIndex((cm: any) => {
      const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
      return moduleId === b.id
    })
    // If not found in array, put at end
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  // Collect all content item IDs from all modules
  const contentItemIds: number[] = []
  modules.forEach((module) => {
    const contentItems = (module as any).contentItems || []
    contentItems.forEach((ci: any) => {
      const itemId = typeof ci.contentItem === 'object' ? ci.contentItem.id : ci.contentItem
      if (itemId && !contentItemIds.includes(itemId)) {
        contentItemIds.push(itemId)
      }
    })
  })

  // Fetch all content items in one query
  const contentItemsResult = await payload.find({
    collection: 'content-items',
    where: {
      id: { in: contentItemIds },
    },
    limit: 1000,
    depth: 2, // Populate media relationships in rich text content
  })

  // Create a map of content items by ID
  const contentItemsMap = new Map<number, ContentItem>()
  contentItemsResult.docs.forEach((item) => {
    contentItemsMap.set(item.id, item as ContentItem)
  })

  // Build course structure with lessons and quizzes arrays
  const transformedCourse = {
    ...course,
    modules: modules.map((module) => {
      const contentItems = (module as any).contentItems || []
      
      // Use contentItems array order directly (array index IS the order)
      // Build lessons and quizzes arrays from contentItems
      const lessons: any[] = []
      const quizzes: any[] = []
      const orderedItems: Array<
        | { type: 'lesson'; id: number; lesson: any }
        | { type: 'quiz'; id: number; quiz: any }
      > = []

      contentItems.forEach((ci: any) => {
        const itemId = typeof ci.contentItem === 'object' ? ci.contentItem.id : ci.contentItem
        const contentItem = contentItemsMap.get(itemId)
        
        if (!contentItem) return

        const itemData = {
          ...contentItem,
          isFree: ci.isFree || false, // Get isFree from module's contentItems array
        }

        if (contentItem.contentType === 'lesson') {
          lessons.push(itemData)
          orderedItems.push({ type: 'lesson', id: contentItem.id, lesson: itemData })
        } else if (contentItem.contentType === 'quiz') {
          quizzes.push(itemData)
          orderedItems.push({ type: 'quiz', id: contentItem.id, quiz: itemData })
        }
      })

      return {
        ...module,
        lessons,
        quizzes,
        orderedItems,
        contentItems: contentItems, // Preserve for reference (already in correct order)
      }
    }),
  }

  return transformedCourse
}

