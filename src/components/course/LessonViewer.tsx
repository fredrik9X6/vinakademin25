'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  BookOpen,
  User,
  Users,
  Play,
  Lock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Menu,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { WineReviewForm } from './WineReviewForm'
import CourseTableOfContents from './CourseTableOfContents'
import { useCourseProgress } from '@/hooks/use-course-progress'
import { getFlattenedCourseItems } from '@/lib/course-utils'
import ReviewComparison from './ReviewComparison'
import { useActiveSession } from '@/context/SessionContext'
// QuizViewer removed

interface LessonViewerProps {
  course: {
    id: number
    title: string
    slug?: string
    modules: Array<{
      id: number
      title: string
      description?: string
      order?: number
      lessons: Array<{
        id: number
        title: string
        description?: string
        content?: any
        order?: number
        isFree?: boolean
        videoProvider?: string
        videoUrl?: string
        lessonType?: 'video' | 'text' | 'quiz' | 'mixed'
        muxData?: {
          playbackId?: string
          status?: string
          duration?: number
        }
        status?: string
        hasQuiz?: boolean
        quiz?: any
      }>
    }>
  }
  lesson: {
    id: number
    title: string
    description?: string
    content?: any
    order?: number
    isFree?: boolean
    videoProvider?: string
    videoUrl?: string
    lessonType?: 'video' | 'text' | 'quiz' | 'mixed'
    muxData?: {
      playbackId?: string
      status?: string
      duration?: number
    }
    status?: string
    hasQuiz?: boolean
    quiz?: any
  }
  module: {
    id: number
    title: string
    description?: string
    order?: number
  }
  userHasAccess?: boolean
  sessionId?: string
  isSessionParticipant?: boolean
  // Separate prop for actual purchase status (for ToC display)
  userPurchasedAccess?: boolean
}

export default function LessonViewer({
  course,
  lesson,
  module,
  userHasAccess = false,
  sessionId,
  isSessionParticipant = false,
  userPurchasedAccess = false,
}: LessonViewerProps) {
  const router = useRouter()
  const {
    progress: courseProgress,
    loading: progressLoading,
    markLessonCompleted,
    toggleLessonCompletion,
    isLessonCompleted,
    updateLessonProgress,
  } = useCourseProgress(course.id, isSessionParticipant) // Pass isSessionParticipant to disable progress tracking
  const { activeSession } = useActiveSession()

  const [isTocOpen, setIsTocOpen] = useState(false)
  const [showReviewComparison, setShowReviewComparison] = useState(false)

  // Use session from props or from context (for persistent navigation)
  const effectiveSessionId =
    sessionId || (activeSession?.courseId === course.id ? activeSession.sessionId : null)

  const buildUrl = (base: string) => {
    return effectiveSessionId ? `${base}&session=${effectiveSessionId}` : base
  }

  const isLessonFree = lesson.isFree || false
  // Allow access if: user has purchased, is session participant, OR lesson is free (authenticated users can access free lessons)
  const canAccessLesson = userHasAccess || isSessionParticipant || isLessonFree

  // Get all items (lessons and quizzes) in order
  const allItems = getFlattenedCourseItems(course.modules)
  const currentItemIndex = allItems.findIndex(
    (item) => item.type === 'lesson' && item.id === lesson.id,
  )

  const navigateToItem = (item: { type: 'lesson' | 'quiz'; id: number }) => {
    if (item.type === 'lesson') {
      router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?lesson=${item.id}`))
    } else {
      router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?quiz=${item.id}`))
    }
  }

  const goToNextLesson = async () => {
    // Auto-mark current lesson as complete when navigating to next
    if (!isLessonCompleted(lesson.id)) {
      await markLessonCompleted(lesson.id)
    }

    if (currentItemIndex < allItems.length - 1) {
      navigateToItem(allItems[currentItemIndex + 1])
    }
  }

  const goToPrevLesson = () => {
    if (currentItemIndex > 0) {
      navigateToItem(allItems[currentItemIndex - 1])
    }
  }

  const navigateToLesson = (lessonId: number) => {
    router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?lesson=${lessonId}`))
  }

  const handleItemClick = (moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => {
    if (item.type === 'lesson') {
      navigateToLesson(item.id)
    } else {
      router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?quiz=${item.id}`))
    }
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* Video Player or Content Area */}
            {canAccessLesson ? (
              <Card>
                <CardContent className="p-0">
                  {lesson.videoProvider === 'mux' &&
                  lesson.muxData?.playbackId &&
                  lesson.muxData.status === 'ready' ? (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <MuxPlayer
                        playbackId={lesson.muxData.playbackId}
                        metadata={{
                          video_title: lesson.title,
                          video_id: lesson.id.toString(),
                        }}
                        streamType="on-demand"
                        className="w-full h-full"
                        style={{
                          // Theme Mux Player to use brand orange accents
                          ['--media-accent-color' as any]: '#f97316', // orange-500
                          ['--media-focus-ring-color' as any]: '#f97316',
                          ['--media-controls-background' as any]: 'rgba(0,0,0,0.4)',
                        }}
                        onTimeUpdate={(e: any) => {
                          try {
                            const el = e?.target as HTMLMediaElement
                            if (!el?.currentTime || !el?.duration) return
                            const pct = Math.round((el.currentTime / el.duration) * 100)
                            updateLessonProgress(lesson.id, pct >= 90, pct)
                          } catch {}
                        }}
                        onEnded={() => {
                          markLessonCompleted(lesson.id)
                          updateLessonProgress(lesson.id, true, 100)
                        }}
                      />
                    </div>
                  ) : lesson.videoProvider === 'youtube' && lesson.videoUrl ? (
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe src={lesson.videoUrl} className="w-full h-full" allowFullScreen />
                    </div>
                  ) : lesson.videoProvider === 'none' || !lesson.videoProvider ? null : ( // No video, content will be shown below
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center text-white">
                      <div className="text-center">
                        <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Video förbereds...</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Detta innehåll är betalinnehåll</h3>
                  <p className="text-muted-foreground mb-4">
                    Du behöver köpa vinprovningen för att få tillgång till detta moment
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      router.push(
                        effectiveSessionId
                          ? `/vinprovningar/${course.slug || course.id}?session=${effectiveSessionId}`
                          : `/vinprovningar/${course.slug || course.id}`,
                      )
                    }
                  >
                    Köp vinprovning
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Lesson Info */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{module.title}</Badge>
                  {lesson.isFree && <Badge variant="secondary">Gratis</Badge>}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold">{lesson.title}</h1>
                {lesson.description && (
                  <div className="text-base md:text-lg text-muted-foreground">
                    <RichTextRenderer content={lesson.description} />
                  </div>
                )}
              </div>
              {/* Desktop navigation */}
              <div className="hidden md:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPrevLesson}
                  disabled={currentItemIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Föregående
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={goToNextLesson}
                  disabled={currentItemIndex === allItems.length - 1}
                >
                  Nästa <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Wine Review */}
            {canAccessLesson && (lesson as any).lessonType === 'wineReview' && (
              <div className="space-y-6">
                <WineReviewForm
                  key={`wine-review-${lesson.id}`}
                  lessonId={lesson.id}
                  courseId={Number(course.id)}
                  sessionId={sessionId}
                  wineIdProp={
                    // Extract wine ID from answerKeyReview if available
                    (lesson as any).answerKeyReview?.wine
                      ? typeof (lesson as any).answerKeyReview.wine === 'object'
                        ? (lesson as any).answerKeyReview.wine.id
                        : (lesson as any).answerKeyReview.wine
                      : undefined
                  }
                  onSubmit={() => {
                    // Show comparison if in a session
                    if (sessionId) {
                      setShowReviewComparison(true)
                    }
                  }}
                />

                {/* Show review comparison in group sessions */}
                {sessionId && showReviewComparison && (
                  <div className="mt-8">
                    <ReviewComparison
                      sessionId={sessionId}
                      lessonId={lesson.id}
                      onRefresh={() => {
                        // Optionally refresh lesson data
                      }}
                    />
                  </div>
                )}

                {/* Show comparison toggle for session hosts/participants */}
                {sessionId && !showReviewComparison && (
                  <Card className="mt-6">
                    <CardContent className="py-6 text-center">
                      <Button
                        onClick={() => setShowReviewComparison(true)}
                        variant="outline"
                        className="gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Visa alla deltagarnas smaknoteringar
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Lesson Content */}
            {canAccessLesson && lesson.content && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Lektionsinnehåll
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextRenderer content={lesson.content} />
                </CardContent>
              </Card>
            )}

            {/* Quiz preview removed; quizzes are shown as lesson-like items in ToC */}

            {/* Small completion toggle at bottom - Only on mobile */}
            {canAccessLesson && (
              <Card className="lg:hidden mt-6">
                <CardContent className="py-3 px-4">
                  <Button
                    variant={isLessonCompleted(lesson.id) ? 'outline' : 'ghost'}
                    size="sm"
                    onClick={() => toggleLessonCompletion(lesson.id)}
                    className="w-full flex items-center justify-center gap-2 text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isLessonCompleted(lesson.id)
                      ? 'Slutförd ✓ (klicka för att ångra)'
                      : 'Markera som slutförd'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Table of Contents Sidebar - Desktop always visible, Mobile collapsible */}
          <div className="space-y-6 order-1 lg:order-2">
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
              className={`${isTocOpen ? 'block animate-in slide-in-from-top-2 fade-in duration-300' : 'hidden'} lg:block space-y-6 lg:sticky lg:top-24 lg:self-start transition-all`}
            >
              <CourseTableOfContents
                modules={course.modules as any}
                courseProgress={courseProgress || undefined}
                userHasAccess={userPurchasedAccess || isSessionParticipant}
                activeLessonId={lesson.id}
                onItemClick={handleItemClick}
                hideMobileProgress={true}
              />

              {/* Mark as complete - Desktop only */}
              {canAccessLesson && (
                <Card className="hidden lg:block">
                  <CardHeader>
                    <CardTitle className="text-base">Lektion slutförd?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={isLessonCompleted(lesson.id) ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => toggleLessonCompletion(lesson.id)}
                      className="w-full flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isLessonCompleted(lesson.id)
                        ? 'Markera som ej slutförd'
                        : 'Markera som slutförd'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Markera denna lektion som slutförd för att uppdatera dina framsteg.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Fixed */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50">
        <div className="flex items-center justify-between p-4 gap-2">
          <Button
            variant="outline"
            size="lg"
            onClick={goToPrevLesson}
            disabled={currentItemIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            <span className="hidden xs:inline">Föregående</span>
          </Button>
          <div className="text-sm text-muted-foreground px-2">
            {currentItemIndex + 1} / {allItems.length}
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={goToNextLesson}
            disabled={currentItemIndex === allItems.length - 1}
            className="flex-1"
          >
            <span className="hidden xs:inline">Nästa</span>
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Add bottom padding to prevent content from being hidden behind fixed nav */}
      <div className="md:hidden h-20" />
    </div>
  )
}
