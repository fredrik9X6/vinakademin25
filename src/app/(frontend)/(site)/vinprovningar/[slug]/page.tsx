import { getPayload } from 'payload'
import config from '@/payload.config'
import { Course, Module, ContentItem } from '@/payload-types'
import { notFound, redirect } from 'next/navigation'
import CourseOverview from '@/components/course/CourseOverview'
import LessonViewer from '@/components/course/LessonViewer'
import CourseQuizViewer from '@/components/course/CourseQuizViewer'
import CourseCompletionPage from '@/components/course/CourseCompletionPage'
import { cookies } from 'next/headers'
import { getUser } from '@/lib/get-user'
import { markFreeLessons } from '@/lib/course-utils'

interface CoursePageProps {
  params: Promise<{
    slug: string
  }>
  searchParams: Promise<{
    lesson?: string
    quiz?: string
    session?: string
    completed?: string
  }>
}

export default async function CoursePage({ params, searchParams }: CoursePageProps) {
  const payload = await getPayload({ config })

  // Await params and searchParams in Next.js 15
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  // Fetch the course by slug
  const courseResult = await payload.find({
    collection: 'vinprovningar',
    where: {
      and: [{ slug: { equals: resolvedParams.slug } }, { _status: { equals: 'published' } }],
    },
    depth: 1, // Populate featuredImage and instructor
    limit: 1,
  })

  if (!courseResult.docs.length) {
    notFound()
  }

  const course = courseResult.docs[0]

  // Get module IDs from course's modules array
  const courseModules = (course as any).modules || []
  const moduleIds = courseModules
    .map((cm: any) => {
      const moduleId = typeof cm.module === 'object' ? cm.module.id : cm.module
      return moduleId
    })
    .filter(Boolean)

  if (moduleIds.length === 0) {
    // No modules yet, return course with empty modules array
    const courseWithModules = {
      ...course,
      modules: [],
    } as any

    return (
      <div className="min-h-screen bg-background">
        <CourseOverview
          course={courseWithModules}
          userHasAccess={false}
          isSessionParticipant={false}
        />
      </div>
    )
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
  // Use depth 3 to ensure questions are fully populated (content-item -> questions array -> question relationship -> question object)
  const contentItemsResult = await payload.find({
    collection: 'content-items',
    where: {
      id: { in: contentItemIds },
    },
    limit: 1000,
    depth: 3, // Increased depth to populate questions and their nested relationships
  })

  // Create a map of content items by ID
  const contentItemsMap = new Map<number, ContentItem>()
  contentItemsResult.docs.forEach((item) => {
    contentItemsMap.set(item.id, item as ContentItem)
  })

  // Build course structure with lessons and quizzes arrays
  const courseWithModules = {
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
  } as any

  // Check if we're viewing a specific lesson or quiz
  const selectedLessonId = resolvedSearchParams.lesson
    ? parseInt(resolvedSearchParams.lesson)
    : null
  const selectedQuizId = resolvedSearchParams.quiz ? parseInt(resolvedSearchParams.quiz) : null
  let selectedLesson = null
  let selectedModule = null
  let selectedQuiz: any = null

  if (selectedLessonId) {
    for (const module of courseWithModules.modules) {
      const lesson = module.lessons.find((l: any) => l.id === selectedLessonId)
      if (lesson) {
        selectedLesson = lesson
        selectedModule = module
        break
      }
    }
  }
  if (!selectedLesson && selectedQuizId) {
    for (const module of courseWithModules.modules) {
      const quiz = module.quizzes?.find((q: any) => q.id === selectedQuizId)
      if (quiz) {
        selectedQuiz = quiz
        selectedModule = module
        break
      }
    }
  }

  // Check authentication
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')
  const isAuthenticated = !!payloadToken

  // Check if this is a session participant (from localStorage, passed via URL)
  const sessionId = resolvedSearchParams.session
  let isSessionParticipant = false
  let sessionData = null

  if (sessionId) {
    try {
      // Verify session exists and is active
      const session = await payload.findByID({
        collection: 'course-sessions',
        id: sessionId,
      })

      if (session && session.status === 'active') {
        const sessionCourseId =
          typeof session.course === 'object' ? session.course.id : session.course
        if (sessionCourseId === course.id) {
          isSessionParticipant = true
          sessionData = session
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    }
  }

  // Check if the selected lesson is free
  const isSelectedLessonFree = selectedLesson?.isFree || false

  // Check if the selected quiz is free
  const isSelectedQuizFree = selectedQuiz?.isFree || false

  // Check if user has access to this specific course
  let userHasAccess = false
  let currentUser = null
  
  // Always try to get the user, even if cookie check failed (cookie check might be unreliable)
  try {
    // Get the current user
    currentUser = await getUser()

    if (currentUser) {
      // Check if user has enrolled in this course
      const enrollment = await payload.find({
        collection: 'enrollments',
        where: {
          and: [
            { user: { equals: currentUser.id.toString() } },
            { course: { equals: course.id.toString() } },
            { status: { equals: 'active' } },
          ],
        },
        limit: 1,
      })

      userHasAccess = enrollment.docs.length > 0
    }
  } catch (error) {
    // If there's an error checking enrollment, assume no access
    console.error('Error checking course enrollment:', error)
    userHasAccess = false
  }

  // Require authentication for free lessons/quizzes
  // Redirect to login if user is not authenticated and trying to access a free lesson/quiz
  if ((isSelectedLessonFree || isSelectedQuizFree) && !isSessionParticipant) {
    // Only redirect if we're sure the user is not authenticated
    // Check getUser() result (more reliable than cookie check)
    if (!currentUser) {
      const currentUrl = `/vinprovningar/${course.slug || course.id}${selectedLessonId ? `?lesson=${selectedLessonId}` : selectedQuizId ? `?quiz=${selectedQuizId}` : ''}`
      redirect(`/logga-in?from=${encodeURIComponent(currentUrl)}`)
    }
  }

  // Note: We no longer redirect non-authenticated users to login for paid content
  // Instead, we show them a locked card with a purchase CTA in the LessonViewer/QuizViewer

  // Session participants have full access to all course content
  // Note: We pass the actual userHasAccess to components and let them handle
  // free lesson checks individually to properly show lock icons in TOC
  const effectiveUserAccess = userHasAccess || isSessionParticipant

  // Check if user has completed the course and show completion page
  let userProgress = null
  let showCompletionPage = false

  if (isAuthenticated && userHasAccess) {
    try {
      const user = await getUser()
      if (user) {
        const progressResult = await payload.find({
          collection: 'user-progress',
          where: {
            and: [
              { user: { equals: user.id.toString() } },
              { course: { equals: course.id.toString() } },
            ],
          },
          limit: 1,
        })

        if (progressResult.docs.length > 0) {
          userProgress = progressResult.docs[0]
          // Show completion page only when explicitly requested via ?completed=true
          showCompletionPage =
            userProgress.status === 'completed' &&
            resolvedSearchParams.completed === 'true' &&
            !selectedLesson &&
            !selectedQuiz
        }
      }
    } catch (error) {
      console.error('Error fetching user progress:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {showCompletionPage ? (
        <CourseCompletionPage
          course={courseWithModules}
          progressData={{
            completedAt: userProgress?.completedAt ?? undefined,
            timeSpent: userProgress?.timeSpent ?? undefined,
            progressPercentage: userProgress?.progressPercentage ?? undefined,
            certificateIssued: userProgress?.certificateIssued ?? undefined,
          }}
        />
      ) : selectedLesson ? (
        <LessonViewer
          course={courseWithModules}
          lesson={selectedLesson}
          module={selectedModule}
          userHasAccess={effectiveUserAccess || (!!currentUser && isSelectedLessonFree)}
          userPurchasedAccess={userHasAccess}
          sessionId={sessionId || undefined}
          isSessionParticipant={isSessionParticipant}
        />
      ) : selectedQuiz ? (
        <CourseQuizViewer
          course={courseWithModules}
          quiz={selectedQuiz}
          module={selectedModule}
          userHasAccess={effectiveUserAccess || (!!currentUser && isSelectedQuizFree)}
        />
      ) : (
        <CourseOverview
          course={courseWithModules}
          userHasAccess={userHasAccess}
          isSessionParticipant={isSessionParticipant}
          sessionId={sessionId}
        />
      )}
    </div>
  )
}

// Generate static params for published courses
export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return []

  const hasDatabaseUrl = Boolean(
    process.env.DATABASE_URI ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING,
  )

  if (!process.env.PAYLOAD_SECRET || !hasDatabaseUrl) {
    console.warn(
      '[generateStaticParams] Skipping course prebuild – missing PAYLOAD_SECRET or database URL.',
    )
    return []
  }

  try {
    const payload = await getPayload({ config })

    const courses = await payload.find({
      collection: 'vinprovningar',
      where: { _status: { equals: 'published' } },
      limit: 1000,
    })

    return courses.docs
      .filter((course) => course.slug)
      .map((course) => ({
        slug: course.slug,
      }))
  } catch (error) {
    console.warn('[generateStaticParams] Failed to fetch courses during build:', error)
    return []
  }
}
