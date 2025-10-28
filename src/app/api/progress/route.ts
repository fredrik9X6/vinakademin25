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
      collection: 'courses',
      id: courseIdInt,
    })

    // Get all modules for this course first
    const modules = await payload.find({
      collection: 'modules',
      where: { course: { equals: courseIdInt } },
      limit: 1000,
    })

    // Then get all lessons for these modules
    const lessons = await payload.find({
      collection: 'lessons',
      where: {
        module: {
          in: modules.docs.map((m: any) => m.id),
        },
      },
      limit: 1000,
    })

    // Also get all quizzes for these modules (for fallback counting when module.contents is not used)
    const quizzes = await payload.find({
      collection: 'quizzes',
      where: {
        module: {
          in: modules.docs.map((m: any) => m.id),
        },
      },
      limit: 1000,
    })

    // Build module -> lessons/quizzes maps
    const lessonsByModule = new Map<number, any[]>()
    for (const l of lessons.docs as any[]) {
      const mid = Number(typeof l.module === 'object' ? l.module?.id : l.module)
      if (!lessonsByModule.has(mid)) lessonsByModule.set(mid, [])
      lessonsByModule.get(mid)!.push(l)
    }
    const quizzesByModule = new Map<number, any[]>()
    for (const q of quizzes.docs as any[]) {
      const mid = Number(typeof q.module === 'object' ? q.module?.id : q.module)
      if (!quizzesByModule.has(mid)) quizzesByModule.set(mid, [])
      quizzesByModule.get(mid)!.push(q)
    }

    // Compute total count of course items (lessons + quizzes) respecting module.contents ordering when present
    const moduleIdToLessonsCount = new Map<number, number>()
    for (const l of lessons.docs as any[]) {
      const mid = typeof l.module === 'object' ? l.module.id : l.module
      moduleIdToLessonsCount.set(Number(mid), (moduleIdToLessonsCount.get(Number(mid)) || 0) + 1)
    }

    const moduleIdToQuizzesCount = new Map<number, number>()
    for (const q of quizzes.docs as any[]) {
      const mid = typeof q.module === 'object' ? q.module.id : q.module
      moduleIdToQuizzesCount.set(Number(mid), (moduleIdToQuizzesCount.get(Number(mid)) || 0) + 1)
    }

    const totalItems = (modules.docs as any[]).reduce((sum, m: any) => {
      if (Array.isArray(m.contents) && m.contents.length > 0) {
        const count = m.contents.filter(
          (b: any) =>
            b?.blockType === 'lesson-item' ||
            b?.blockType === 'quiz-item' ||
            b?.blockType === 'wine-review-item',
        ).length
        return sum + count
      }
      const lCount = moduleIdToLessonsCount.get(Number(m.id)) || 0
      const qCount = moduleIdToQuizzesCount.get(Number(m.id)) || 0
      return sum + lCount + qCount
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

    // Create lesson progress array
    const lessonProgress = lessons.docs.map((lesson: any) => {
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
        progress: isCompleted ? 100 : 0, // Can be enhanced with actual video progress
        lastWatchedAt: null, // Can be enhanced with actual tracking
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
      const contents = Array.isArray(m.contents) ? m.contents : []
      if (contents.length > 0) {
        const out: OrderedItem[] = []
        for (const c of contents) {
          if (c.blockType === 'lesson-item') {
            const id = Number(typeof c.lesson === 'object' ? c.lesson?.id : c.lesson)
            if (id) out.push({ type: 'lesson', id })
          }
          if (c.blockType === 'quiz-item') {
            const id = Number(typeof c.quiz === 'object' ? c.quiz?.id : c.quiz)
            if (id) out.push({ type: 'quiz', id })
          }
          // Wine reviews are tracked as lessons in completedLessons
          if (c.blockType === 'wine-review-item') {
            const id = Number(typeof c.wineReview === 'object' ? c.wineReview?.id : c.wineReview)
            if (id) out.push({ type: 'lesson', id })
          }
        }
        return out
      }
      const lessonItems = (lessonsByModule.get(mId) || [])
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
        .map((l: any) => ({ type: 'lesson' as const, id: Number(l.id) }))
      const quizItems = (quizzesByModule.get(mId) || []).map((q: any) => ({
        type: 'quiz' as const,
        id: Number(q.id),
      }))
      return [...lessonItems, ...quizItems]
    }

    const modulesProgress = (modules.docs as any[])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((m) => {
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
    for (const m of (modules.docs as any[]).sort((a, b) => (a.order || 0) - (b.order || 0))) {
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

    const quizCount = quizzes.totalDocs || quizzes.docs.length || 0

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
    const modules = await payload.find({
      collection: 'modules',
      where: { course: { equals: courseIdInt } },
      limit: 1000,
    })

    const totalLessons = await payload.find({
      collection: 'lessons',
      where: {
        module: {
          in: modules.docs.map((m: any) => m.id),
        },
      },
      limit: 1000,
    })

    const totalQuizzes = await payload.find({
      collection: 'quizzes',
      where: {
        module: {
          in: modules.docs.map((m: any) => m.id),
        },
      },
      limit: 1000,
    })

    // Build lesson and quiz counts per module
    const moduleIdToLessonsCount = new Map<number, number>()
    for (const l of totalLessons.docs as any[]) {
      const mid = typeof l.module === 'object' ? l.module.id : l.module
      moduleIdToLessonsCount.set(Number(mid), (moduleIdToLessonsCount.get(Number(mid)) || 0) + 1)
    }

    const moduleIdToQuizzesCount = new Map<number, number>()
    for (const q of totalQuizzes.docs as any[]) {
      const mid = typeof q.module === 'object' ? q.module.id : q.module
      moduleIdToQuizzesCount.set(Number(mid), (moduleIdToQuizzesCount.get(Number(mid)) || 0) + 1)
    }

    // Calculate total items (lessons + quizzes) respecting module.contents when present
    const totalCount = (modules.docs as any[]).reduce((sum, m: any) => {
      if (Array.isArray(m.contents) && m.contents.length > 0) {
        const count = m.contents.filter(
          (b: any) =>
            b?.blockType === 'lesson-item' ||
            b?.blockType === 'quiz-item' ||
            b?.blockType === 'wine-review-item',
        ).length
        return sum + count
      }
      const lCount = moduleIdToLessonsCount.get(Number(m.id)) || 0
      const qCount = moduleIdToQuizzesCount.get(Number(m.id)) || 0
      return sum + lCount + qCount
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
