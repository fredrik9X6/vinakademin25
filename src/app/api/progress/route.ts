import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET user progress for a specific course
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const user = await getUser()
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Parse courseId as integer
    const courseIdInt = parseInt(courseId, 10)
    if (isNaN(courseIdInt)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }

    // Find user progress for this course
    const progressResult = await payload.find({
      collection: 'user-progress',
      where: {
        and: [{ user: { equals: Number(user.id) } }, { course: { equals: courseIdInt } }],
      },
      limit: 1,
    })

    let progress = progressResult.docs[0]

    if (!progress) {
      // Create initial progress record if it doesn't exist
      progress = await payload.create({
        collection: 'user-progress',
        data: {
          user: Number(user.id),
          course: courseIdInt,
          courseTitle: '', // Will be updated by course data
          status: 'not-started',
          progressPercentage: 0,
          enrolledAt: new Date().toISOString(),
          completedLessons: [],
          completedModules: [],
        },
      })
    }

    // Get course data to calculate total lessons
    const course = await payload.findByID({
      collection: 'vinprovningar',
      id: courseIdInt,
      depth: 1, // Populate modules array
    })

    // Get module IDs from course's modules array
    const courseModules = (course as any).modules || []
    const moduleIds = courseModules
      .map((cm: any) => {
        const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
        return moduleId
      })
      .filter(Boolean)

    if (moduleIds.length === 0) {
      return NextResponse.json({
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: 0,
        lessonProgress: [],
        status: progress.status,
        enrolledAt: progress.enrolledAt,
        lastAccessedAt: progress.lastAccessedAt,
        completedQuizzes: [],
        modulesProgress: [],
        nextIncompleteItem: null,
        quizCount: 0,
      })
    }

    // Get all modules with their contentItems populated
    const modules = await payload.find({
      collection: 'modules',
      where: {
        id: { in: moduleIds },
      },
      limit: 1000,
      depth: 2, // Populate contentItems.contentItem
    })

    // Sort modules by their order in the course's modules array (array index IS the order)
    const sortedModules = modules.docs.sort((a, b) => {
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

    // Collect all content item IDs
    const contentItemIds: number[] = []
    sortedModules.forEach((module) => {
      const contentItems = (module as any).contentItems || []
      contentItems.forEach((ci: any) => {
        const itemId = typeof ci.contentItem === 'object' ? ci.contentItem.id : ci.contentItem
        if (itemId && !contentItemIds.includes(itemId)) {
          contentItemIds.push(itemId)
        }
      })
    })

    // Fetch all content items
    const contentItemsResult = await payload.find({
      collection: 'content-items',
      where: {
        id: { in: contentItemIds },
      },
      limit: 1000,
    })

    // Create maps for quick lookup
    const contentItemsMap = new Map<number, any>()
    contentItemsResult.docs.forEach((item) => {
      contentItemsMap.set(item.id, item)
    })

    // Build lessons and quizzes arrays for each module
    const lessonsByModule = new Map<number, any[]>()
    const quizzesByModule = new Map<number, any[]>()
    
    sortedModules.forEach((module) => {
      const contentItems = (module as any).contentItems || []
      // Array order IS the order - no need to sort
      
      const moduleLessons: any[] = []
      const moduleQuizzes: any[] = []
      
      contentItems.forEach((ci: any) => {
        const itemId = typeof ci.contentItem === 'object' ? ci.contentItem.id : ci.contentItem
        const contentItem = contentItemsMap.get(itemId)
        
        if (!contentItem) return
        
        if (contentItem.contentType === 'lesson') {
          moduleLessons.push(contentItem)
        } else if (contentItem.contentType === 'quiz') {
          moduleQuizzes.push(contentItem)
        }
      })
      
      if (moduleLessons.length > 0) lessonsByModule.set(module.id, moduleLessons)
      if (moduleQuizzes.length > 0) quizzesByModule.set(module.id, moduleQuizzes)
    })

    // Calculate total items
    const totalItems = sortedModules.reduce((sum, module) => {
      const contentItems = (module as any).contentItems || []
      return sum + contentItems.length
    }, 0)

    const completedLessonsOnly = Array.isArray(progress.completedLessons)
      ? progress.completedLessons.length
      : 0

    // Calculate progress percentage
    const completedQuizzes = Array.isArray((progress as any).quizScores)
      ? (progress as any).quizScores
          .filter((qs: any) => qs && qs.passed)
          .map((qs: any) => (typeof qs.quiz === 'object' ? qs.quiz.id : qs.quiz))
          .map((id: any) => Number(id))
      : []

    const completedItems = completedLessonsOnly + completedQuizzes.length
    const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

    // Create lesson progress array (all lessons from all modules)
    const allLessons: any[] = []
    sortedModules.forEach((module) => {
      const lessons = lessonsByModule.get(module.id) || []
      allLessons.push(...lessons)
    })

    const lessonProgress = allLessons.map((lesson: any) => {
      const isCompleted =
        Array.isArray(progress.completedLessons) &&
        progress.completedLessons.some((completedLesson: any) => {
          const lessonId =
            typeof completedLesson === 'object' ? completedLesson.id : completedLesson
          return lessonId === lesson.id
        })

      return {
        lessonId: lesson.id,
        isCompleted,
        progress: isCompleted ? 100 : 0,
        lastWatchedAt: null,
      }
    })

    // Determine per-module completion and next incomplete item
    const completedLessonsSet = new Set(
      Array.isArray(progress.completedLessons)
        ? progress.completedLessons.map((x: any) => (typeof x === 'object' ? x.id : x))
        : [],
    )
    const completedQuizzesSet = new Set(completedQuizzes)

    type OrderedItem = { type: 'lesson' | 'quiz'; id: number }
    const getOrderedItemsForModule = (m: any): OrderedItem[] => {
      const mId = Number(m.id)
      const contentItems = (m as any).contentItems || []
      
      if (contentItems.length > 0) {
        // Use contentItems array order directly (array index IS the order)
        const items: OrderedItem[] = []
        
        contentItems.forEach((ci: any) => {
          const itemId = typeof ci.contentItem === 'object' ? ci.contentItem.id : ci.contentItem
          const contentItem = contentItemsMap.get(itemId)
          
          if (!contentItem) return
          
          if (contentItem.contentType === 'lesson') {
            items.push({ type: 'lesson', id: contentItem.id })
          } else if (contentItem.contentType === 'quiz') {
            items.push({ type: 'quiz', id: contentItem.id })
          }
        })
        
        return items
      }
      
      // Fallback: use lessons/quizzes arrays if contentItems not available
      const lessonItems = (lessonsByModule.get(mId) || [])
        .map((l: any) => ({ type: 'lesson' as const, id: Number(l.id) }))
      const quizItems = (quizzesByModule.get(mId) || []).map((q: any) => ({
        type: 'quiz' as const,
        id: Number(q.id),
      }))
      return [...lessonItems, ...quizItems]
    }

    const modulesProgress = sortedModules.map((m) => {
      const items = getOrderedItemsForModule(m)
      const completedItems = items.filter((it) =>
        it.type === 'lesson' ? completedLessonsSet.has(it.id) : completedQuizzesSet.has(it.id),
      ).length
      return {
        moduleId: Number(m.id),
        totalItems: items.length,
        completedItems,
        completed: items.length > 0 && completedItems === items.length,
      }
    })

    let nextIncompleteItem: OrderedItem | null = null
    for (const m of sortedModules) {
      const items = getOrderedItemsForModule(m)
      for (const it of items) {
        const done =
          it.type === 'lesson' ? completedLessonsSet.has(it.id) : completedQuizzesSet.has(it.id)
        if (!done) {
          nextIncompleteItem = it
          break
        }
      }
      if (nextIncompleteItem) break
    }

    const quizCount = Array.from(quizzesByModule.values()).reduce((sum, quizzes) => sum + quizzes.length, 0)

    const courseProgress = {
      totalLessons: totalItems,
      completedLessons: completedItems,
      progressPercentage: Math.round(progressPercentage),
      lessonProgress,
      status: progress.status,
      enrolledAt: progress.enrolledAt,
      lastAccessedAt: progress.lastAccessedAt,
      completedQuizzes,
      modulesProgress,
      nextIncompleteItem,
      quizCount,
    }

    return NextResponse.json(courseProgress)
  } catch (error) {
    console.error('Error fetching course progress:', error)
    return NextResponse.json({ error: 'Failed to fetch course progress' }, { status: 500 })
  }
}

// POST to update lesson completion or time-watched
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const user = await getUser()
    const body = await request.json()
    const { courseId, lessonId, isCompleted, progress, positionSeconds, durationSeconds } = body

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!courseId || !lessonId) {
      return NextResponse.json({ error: 'Course ID and Lesson ID are required' }, { status: 400 })
    }

    // Parse courseId as integer
    const courseIdInt = parseInt(courseId, 10)
    if (isNaN(courseIdInt)) {
      return NextResponse.json({ error: 'Invalid course ID' }, { status: 400 })
    }

    // Find or create user progress
    const progressResult = await payload.find({
      collection: 'user-progress',
      where: {
        and: [{ user: { equals: user.id } }, { course: { equals: courseIdInt } }],
      },
      limit: 1,
    })

    let userProgress = progressResult.docs[0]

    if (!userProgress) {
      // Create initial progress record
      userProgress = await payload.create({
        collection: 'user-progress',
        data: {
          user: user.id,
          course: courseIdInt,
          status: 'in-progress',
          progressPercentage: 0,
          enrolledAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          completedLessons: [],
        },
      })
    }

    // Update completed lessons & per-lesson state
    let completedLessons = Array.isArray(userProgress.completedLessons)
      ? [...userProgress.completedLessons]
      : []

    if (isCompleted) {
      // Add lesson to completed if not already there
      const isAlreadyCompleted = completedLessons.some((lesson: any) => {
        const id = typeof lesson === 'object' ? lesson.id : lesson
        return id === lessonId
      })

      if (!isAlreadyCompleted) {
        completedLessons.push(lessonId)
      }
    } else {
      // Remove lesson from completed
      completedLessons = completedLessons.filter((lesson: any) => {
        const id = typeof lesson === 'object' ? lesson.id : lesson
        return id !== lessonId
      })
    }

    // Upsert per-lesson state (position/progress)
    const lessonStates = Array.isArray((userProgress as any).lessonStates)
      ? [...(userProgress as any).lessonStates]
      : []
    const lsIdx = lessonStates.findIndex((s: any) => {
      const sId = typeof s.lesson === 'object' ? s.lesson.id : s.lesson
      return Number(sId) === Number(lessonId)
    })
    const clampedProgress =
      typeof progress === 'number' ? Math.max(0, Math.min(100, progress)) : undefined
    const stateEntry = {
      lesson: Number(lessonId),
      progress: clampedProgress ?? (isCompleted ? 100 : 0),
      positionSeconds:
        typeof positionSeconds === 'number' ? Math.max(0, positionSeconds) : undefined,
      durationSeconds:
        typeof durationSeconds === 'number' ? Math.max(0, durationSeconds) : undefined,
      lastWatchedAt: new Date().toISOString(),
    }
    if (lsIdx >= 0) lessonStates[lsIdx] = { ...lessonStates[lsIdx], ...stateEntry }
    else lessonStates.push(stateEntry)

    // Auto-complete on threshold >= 90%
    const autoComplete = clampedProgress != null && clampedProgress >= 90
    const effectiveCompleted = isCompleted || autoComplete

    // Get total lessons AND quizzes count to calculate progress (matching GET logic)
    const courseForUpdate = await payload.findByID({
      collection: 'vinprovningar',
      id: courseIdInt,
      depth: 1,
    })

    const courseModulesForUpdate = (courseForUpdate as any).modules || []
    const moduleIdsForUpdate = courseModulesForUpdate
      .map((cm: any) => {
        const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
        return moduleId
      })
      .filter(Boolean)

    if (moduleIdsForUpdate.length === 0) {
      // Calculate status early for early return case
      const status: 'not-started' | 'in-progress' | 'completed' | 'paused' | 'dropped' = 
        completedLessons.length === 0 ? 'not-started' : 'in-progress'
      
      return NextResponse.json({
        success: true,
        progress: {
          totalLessons: 0,
          completedLessons: completedLessons.length,
          progressPercentage: 0,
          status,
        },
      })
    }

    const modulesForUpdate = await payload.find({
      collection: 'modules',
      where: {
        id: { in: moduleIdsForUpdate },
      },
      limit: 1000,
      depth: 2,
    })

    // Calculate total items from contentItems
    const totalCount = modulesForUpdate.docs.reduce((sum, module) => {
      const contentItems = (module as any).contentItems || []
      return sum + contentItems.length
    }, 0)

    // Maintain completed list
    if (effectiveCompleted) {
      const already = completedLessons.some(
        (l: any) => (typeof l === 'object' ? l.id : l) === lessonId,
      )
      if (!already) completedLessons.push(lessonId)
    }

    // Calculate completed quizzes (passed quizzes)
    const completedQuizzesCount = Array.isArray((userProgress as any).quizScores)
      ? (userProgress as any).quizScores.filter((qs: any) => qs && qs.passed).length
      : 0

    const completedCount = completedLessons.length + completedQuizzesCount
    const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    // Determine status (ensure it matches UserProgress status enum)
    let status: 'not-started' | 'in-progress' | 'completed' | 'paused' | 'dropped' = 'in-progress'
    if (progressPercentage === 0) {
      status = 'not-started'
    } else if (progressPercentage === 100) {
      status = 'completed'
    }

    // Update progress record
    const updatedProgress = await payload.update({
      collection: 'user-progress',
      id: userProgress.id,
      data: {
        completedLessons,
        lessonStates,
        progressPercentage: Math.round(progressPercentage),
        status,
        lastAccessedAt: new Date().toISOString(),
        ...(status === 'completed' &&
          !userProgress.completedAt && {
            completedAt: new Date().toISOString(),
          }),
        ...(status !== 'not-started' &&
          !userProgress.startedAt && {
            startedAt: new Date().toISOString(),
          }),
      },
    })

    return NextResponse.json({
      success: true,
      progress: {
        totalLessons: totalCount,
        completedLessons: completedCount,
        progressPercentage: Math.round(progressPercentage),
        status,
      },
    })
  } catch (error) {
    console.error('Error updating lesson progress:', error)
    return NextResponse.json({ error: 'Failed to update lesson progress' }, { status: 500 })
  }
}
