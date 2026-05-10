'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Lock,
  BookOpen,
  Menu,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import { Progress } from '@/components/ui/progress'
import CourseTableOfContents from './CourseTableOfContents'
// Removed mock preview component
import QuizAttemptRunner from './QuizAttemptRunner'
import { useRouter } from 'next/navigation'
import { useCourseProgress } from '@/hooks/use-course-progress'
import { useMemo } from 'react'
import { getFlattenedCourseItems } from '@/lib/course-utils'
import { useActiveSession } from '@/context/SessionContext'

interface CourseQuizViewerProps {
  course: any
  module: any
  quiz: any
  userHasAccess?: boolean
  sessionId?: string
  isSessionParticipant?: boolean
  // Separate prop for actual purchase status (for ToC display)
  userPurchasedAccess?: boolean
  /** Optional content rendered below the Innehåll TOC card in the sidebar (e.g. session roster). */
  sidebarExtra?: React.ReactNode
}

export default function CourseQuizViewer({
  course,
  module,
  quiz,
  userHasAccess = false,
  sessionId,
  isSessionParticipant = false,
  userPurchasedAccess = false,
  sidebarExtra,
}: CourseQuizViewerProps) {
  const router = useRouter()
  const [isTocOpen, setIsTocOpen] = useState(false)
  const [theaterMode, setTheaterMode] = useState(false)
  const hasNavigatedToReviewRef = useRef(false)
  const { activeSession } = useActiveSession()

  // Use session from props or from context (for persistent navigation)
  const effectiveSessionId =
    sessionId ||
    (activeSession && activeSession.courseId === course.id ? activeSession.sessionId : null)

  const buildUrl = (base: string) => {
    return effectiveSessionId ? `${base}&session=${effectiveSessionId}` : base
  }

  // Check if quiz is free - but authentication is still required
  const isQuizFree = quiz.isFree || false
  // Allow access if: user has purchased, is session participant, OR quiz is free
  const canAccessQuiz = userHasAccess || isSessionParticipant || isQuizFree

  const {
    progress: courseProgress,
    loading: progressLoading,
    fetchProgress,
    markQuizCompleted,
  } = useCourseProgress(course.id, isSessionParticipant) // Pass isSessionParticipant for local progress tracking

  // Find the next lesson after this quiz within the same module
  const nextItem = useMemo(() => {
    const mod = (course.modules as any[]).find((m) => m.id === module.id)
    if (!mod || !Array.isArray(mod.orderedItems) || mod.orderedItems.length === 0) return null
    const idx = mod.orderedItems.findIndex((it: any) => it.type === 'quiz' && it.id === quiz.id)
    if (idx === -1) return null
    for (let i = idx + 1; i < mod.orderedItems.length; i++) {
      const it = mod.orderedItems[i]
      if (it.type === 'lesson') return { type: 'lesson', id: it.id }
    }
    return null
  }, [course.modules, module.id, quiz.id])

  // Get all items (lessons and quizzes) in order
  const allItems = getFlattenedCourseItems(course.modules)
  const currentItemIndex = allItems.findIndex((item) => item.type === 'quiz' && item.id === quiz.id)
  const isLastQuizItem =
    currentItemIndex >= 0 && allItems.length > 0 && currentItemIndex === allItems.length - 1

  /**
   * Prompt review after completing the last content item in order.
   * Auto-fire paths are suppressed for session participants so followers
   * aren't yanked away mid-tasting. Explicit clicks pass `manual: true`.
   */
  const maybeNavigateToCourseReview = useCallback(
    (manual = false) => {
      if (hasNavigatedToReviewRef.current) return
      if (!manual && isSessionParticipant) return
      hasNavigatedToReviewRef.current = true
      router.push(`/vinprovningar/${course.slug || course.id}/recension`)
    },
    [isSessionParticipant, router, course.slug, course.id],
  )

  const navigateToItem = (item: { type: 'lesson' | 'quiz'; id: number }) => {
    if (item.type === 'lesson') {
      router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?lesson=${item.id}`))
    } else {
      router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?quiz=${item.id}`))
    }
  }

  const goToNext = () => {
    if (currentItemIndex < allItems.length - 1) {
      navigateToItem(allItems[currentItemIndex + 1])
    }
  }

  const handleQuizNextOrReview = async () => {
    if (isLastQuizItem) {
      // Session participants normally don't auto-progress, but an explicit
      // click on "Betygsätt vinprovningen" is a deliberate user action and
      // should take them to the review page. Skip the progress fetch in
      // session mode (per-user progress isn't tracked there).
      if (!isSessionParticipant) await fetchProgress()
      maybeNavigateToCourseReview(true)
      return
    }
    if (!isSessionParticipant) await fetchProgress()
    goToNext()
  }

  const goToPrev = () => {
    if (currentItemIndex > 0) {
      navigateToItem(allItems[currentItemIndex - 1])
    }
  }

  const handleItemClick = (moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => {
    navigateToItem(item)
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-8 ${theaterMode ? 'max-w-full' : 'max-w-7xl'}`}>
        <div className={`grid grid-cols-1 gap-8 ${theaterMode ? '' : 'lg:grid-cols-3'}`}>
          {/* Main Content */}
          <div className={`space-y-6 order-2 lg:order-1 ${theaterMode ? '' : 'lg:col-span-2'}`}>
            {/* Title and Navigation */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{module.title}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" /> Quiz
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-heading">{quiz.title}</h1>
                </div>
                {/* Desktop navigation */}
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTheaterMode(!theaterMode)}
                    className="gap-1.5 text-muted-foreground"
                  >
                    {theaterMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    <span className="text-xs">{theaterMode ? 'Visa meny' : 'Teaterläge'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={goToPrev}
                    disabled={currentItemIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Föregående
                  </Button>
                  <button
                    type="button"
                    onClick={() => void handleQuizNextOrReview()}
                    className="btn-brand"
                  >
                    {isLastQuizItem ? (
                      <>
                        Betygsätt vinprovningen <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Nästa <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* end breadcrumbs/title wrapper */}
            </div>

            {/* Quiz Viewer */}
            {canAccessQuiz ? (
              <div className="space-y-6">
                <QuizAttemptRunner
                  key={quiz.id}
                  quiz={quiz}
                  onPassed={async () => {
                    if (isSessionParticipant) {
                      markQuizCompleted(quiz.id)
                      return
                    }
                    try {
                      await fetchProgress()
                      if (isLastQuizItem) {
                        maybeNavigateToCourseReview()
                      }
                    } catch {}
                  }}
                  onNavigateNext={() => {
                    void handleQuizNextOrReview()
                  }}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Detta innehåll är betalinnehåll</h3>
                  <p className="text-muted-foreground mb-4">
                    Du behöver köpa vinprovningen för att få tillgång till detta quiz
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => router.push(`/vinprovningar/${course.slug || course.id}`)}
                  >
                    Köp vinprovning
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table of Contents Sidebar - Desktop always visible (unless theater mode), Mobile collapsible */}
          <div className={`space-y-6 order-1 lg:order-2 ${theaterMode ? 'hidden' : ''}`}>
            {/* Mobile TOC Header - Always Visible */}
            <Card className="lg:hidden">
              <CardContent className="p-0">
                {/* Progress indicator - Always visible on mobile */}
                {courseProgress && (
                  <div className="px-4 pt-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Framsteg</span>
                      <Badge variant="secondary" className="text-xs">
                        {courseProgress.completedLessons}/{courseProgress.totalLessons}
                      </Badge>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-orange-50 dark:bg-orange-950">
                      <div
                        className="h-2.5 rounded-full bg-orange-400"
                        style={{
                          width: `${courseProgress.progressPercentage || 0}%`,
                          transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Toggle Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsTocOpen(!isTocOpen)}
                  className="w-full flex items-center justify-between hover:bg-muted rounded-none border-t"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {isTocOpen ? 'Dölj innehåll' : 'Visa allt innehåll'}
                  </span>
                  {isTocOpen ? (
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  ) : (
                    <ChevronRight className="h-4 w-4 -rotate-90" />
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* TOC - Always visible on desktop, collapsible on mobile */}
            <div
              className={`${isTocOpen ? 'block animate-in-from-top-2 fade-in duration-300' : 'hidden'} lg:block space-y-6 lg:sticky lg:top-24 lg:self-start transition-all`}
            >
              <CourseTableOfContents
                modules={course.modules as any}
                courseProgress={courseProgress || undefined}
                userHasAccess={userPurchasedAccess || isSessionParticipant}
                activeQuizId={quiz.id}
                onItemClick={handleItemClick}
                loading={progressLoading}
                hideMobileProgress={true}
              />

              {sidebarExtra}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed */}
      <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        <div className="flex items-center justify-between p-4 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={goToPrev}
            disabled={currentItemIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="hidden xs:inline">Föregående</span>
          </Button>
          <div className="text-sm text-muted-foreground px-2">
            {currentItemIndex + 1} / {allItems.length}
          </div>
          <button
            type="button"
            onClick={() => void handleQuizNextOrReview()}
            className="btn-brand flex-1"
          >
            <span className="hidden xs:inline">
              {isLastQuizItem ? 'Betygsätt' : 'Nästa'}
            </span>
            <ChevronRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      {/* Add bottom padding to prevent content from being hidden behind fixed nav */}
      <div className="md:hidden h-36" />
    </div>
  )
}
