import { getPayload } from 'payload'
import config from '@/payload.config'
import { Course, Module, Lesson } from '@/payload-types'
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
    collection: 'courses',
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

  // Fetch all modules and lessons for this course
  const [modules, lessons, quizzes] = await Promise.all([
    payload.find({
      collection: 'modules',
      where: { course: { equals: course.id } },
      limit: 1000,
      sort: 'order',
    }),
    payload.find({
      collection: 'lessons',
      limit: 1000,
      depth: 2, // Populate media relationships in rich text content
    }),
    payload.find({
      collection: 'quizzes',
      where: { course: { equals: course.id } },
      depth: 2,
      limit: 1000,
    }),
  ])

  // Group lessons by module ID
  const lessonsByModule = lessons.docs.reduce(
    (acc, lesson) => {
      const moduleId = typeof lesson.module === 'object' ? lesson.module.id : lesson.module

      if (moduleId) {
        if (!acc[moduleId]) {
          acc[moduleId] = []
        }
        acc[moduleId].push(lesson)
      }
      return acc
    },
    {} as Record<string, typeof lessons.docs>,
  )

  // Build course structure honoring module.contents ordering if present
  const courseWithModules = {
    ...course,
    modules: modules.docs
      .map((module) => {
        const moduleLessons = lessonsByModule[module.id] || []
        const moduleQuizzes = quizzes.docs.filter((q: any) => {
          const qModule = typeof q.module === 'object' ? q.module?.id : q.module
          return qModule && qModule === module.id
        })
        const contents = Array.isArray((module as any).contents) ? (module as any).contents : []

        // Build ordered arrays based on contents; fallback to numeric order if no contents
        const orderedLessons =
          contents.length > 0
            ? contents
                .filter((c: any) => c.blockType === 'lesson-item')
                .map((c: any) => (typeof c.lesson === 'object' ? c.lesson.id : c.lesson))
                .map((id: any) => moduleLessons.find((l: any) => l.id === id))
                .filter(Boolean)
            : moduleLessons.sort((a, b) => (a.order || 0) - (b.order || 0))

        const orderedQuizzes =
          contents.length > 0
            ? contents
                .filter((c: any) => c.blockType === 'quiz-item')
                .map((c: any) => (typeof c.quiz === 'object' ? c.quiz.id : c.quiz))
                .map((id: any) => quizzes.docs.find((q: any) => q.id === id))
                .filter(Boolean)
            : moduleQuizzes

        // First, create the lessons array with isFree initialized
        const lessonsWithFree = orderedLessons.map((lesson: any) => ({
          ...lesson,
          isFree: false, // Will be set below based on course.freeItemCount
          quiz:
            quizzes.docs.find((q: any) => {
              const qLesson = typeof q.lesson === 'object' ? q.lesson?.id : q.lesson
              return qLesson && qLesson === lesson.id
            }) || null,
          hasQuiz: !!quizzes.docs.find((q: any) => {
            const qLesson = typeof q.lesson === 'object' ? q.lesson?.id : q.lesson
            return qLesson && qLesson === lesson.id
          }),
        }))

        // Create quizzes array with isFree initialized
        const quizzesWithFree = (orderedQuizzes as any[]).map((quiz: any) => ({
          ...quiz, // Keep all quiz properties (including questions!)
          isFree: false, // Will be set below based on course.freeItemCount
        }))

        // Now create orderedItems that reference the SAME objects that will be marked free
        const orderedItems =
          contents.length > 0
            ? contents
                .map((c: any) => {
                  if (c.blockType === 'lesson-item') {
                    const id = Number(typeof c.lesson === 'object' ? c.lesson.id : c.lesson)
                    const lesson = lessonsWithFree.find((l: any) => l.id === id)
                    return lesson ? { type: 'lesson' as const, id, lesson } : null
                  }
                  if (c.blockType === 'quiz-item') {
                    const id = Number(typeof c.quiz === 'object' ? c.quiz.id : c.quiz)
                    const quiz = quizzesWithFree.find((q: any) => q.id === id)
                    return quiz ? { type: 'quiz' as const, id, quiz } : null
                  }
                  return null
                })
                .filter(Boolean)
            : []

        return {
          ...module,
          lessons: lessonsWithFree,
          quizzes: quizzesWithFree,
          orderedItems,
          contents: (module as any).contents, // Preserve contents for counting
        }
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
  } as any // Type assertion to handle null values

  // Mark lessons as free based on course.freeItemCount
  const freeItemCount = course.freeItemCount || 0
  markFreeLessons(courseWithModules.modules, freeItemCount)

  // Check if we're viewing a specific lesson
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
      // Look in module.quizzes (which has isFree property set by markFreeLessons)
      const quiz = ((module as any).quizzes as any[])?.find((q) => q.id === selectedQuizId)
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

  // Note: We no longer redirect non-authenticated users to login for paid content
  // Instead, we show them a locked card with a purchase CTA in the LessonViewer/QuizViewer

  // Check if user has access to this specific course
  let userHasAccess = false
  if (isAuthenticated) {
    try {
      // Get the current user
      const user = await getUser()

      if (user) {
        // Check if user has enrolled in this course
        const enrollment = await payload.find({
          collection: 'enrollments',
          where: {
            and: [
              { user: { equals: user.id.toString() } },
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
  }

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
          userHasAccess={effectiveUserAccess}
          sessionId={sessionId || undefined}
          isSessionParticipant={isSessionParticipant}
        />
      ) : selectedQuiz ? (
        <CourseQuizViewer
          course={courseWithModules}
          quiz={selectedQuiz}
          module={selectedModule}
          userHasAccess={effectiveUserAccess}
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

  if (!hasDatabaseUrl) {
    console.warn('[generateStaticParams] Skipping course prebuild – no database URL configured.')
    return []
  }

  try {
    const payload = await getPayload({ config })

    const courses = await payload.find({
      collection: 'courses',
      where: { _status: { equals: 'published' } },
      limit: 1000,
    })

    return courses.docs
      .filter((course) => course.slug)
      .map((course) => ({
        slug: course.slug,
      }))
  } catch (error) {
    console.warn('[generateStaticParams] Failed to fetch courses – falling back to runtime paths.', error)
    return []
  }
}
