'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Play,
  FileText,
  HelpCircle,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  Lock,
  Wine,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface LessonProgress {
  lessonId: number
  isCompleted: boolean
  lastWatchedAt?: string
  progress?: number // For video lessons (0-100)
}

interface CourseProgress {
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  lessonProgress: LessonProgress[]
  modulesProgress?: Array<{ moduleId: number; completed: boolean }>
  completedQuizzes?: Array<number | string>
}

interface CourseLesson {
  id: number
  title: string
  description?: string
  order?: number
  isFree?: boolean
  videoProvider?: string
  lessonType?: 'video' | 'text' | 'quiz' | 'mixed' | 'wineReview'
  status?: string
  hasQuiz?: boolean
  muxData?: {
    duration?: number
  }
}

interface CourseModule {
  id: number
  title: string
  description?: string
  order?: number
  lessons: CourseLesson[]
  quizzes?: Array<{
    id: number
    title: string
    description?: any
    status?: string
  }>
  orderedItems?: Array<
    | { type: 'lesson'; id: number; lesson: CourseLesson }
    | { type: 'quiz'; id: number; quiz: { id: number; title: string } }
  >
}

interface CourseTableOfContentsProps {
  modules: CourseModule[]
  courseProgress?: CourseProgress
  userHasAccess?: boolean
  activeLessonId?: number
  activeQuizId?: number
  onItemClick: (moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => void
  loading?: boolean
  hideMobileProgress?: boolean
}

export default function CourseTableOfContents({
  modules,
  courseProgress,
  userHasAccess = false,
  activeLessonId,
  activeQuizId,
  onItemClick,
  loading = false,
  hideMobileProgress = false,
}: CourseTableOfContentsProps) {
  const { user: authUser } = useAuth()
  const getLessonIcon = (lesson: CourseLesson) => {
    // Use lessonType if available, otherwise fall back to detecting from other fields
    const type =
      lesson.lessonType ||
      (lesson.hasQuiz ? 'quiz' : lesson.videoProvider !== 'none' ? 'video' : 'text')

    switch (type) {
      case 'quiz':
        return <HelpCircle className="h-4 w-4" />
      case 'wineReview':
        return <Wine className="h-4 w-4" />
      case 'video':
        return <Play className="h-4 w-4" />
      case 'mixed':
        return <BookOpen className="h-4 w-4" />
      case 'text':
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getLessonProgress = (lessonId: number): LessonProgress | undefined => {
    return courseProgress?.lessonProgress.find((p) => p.lessonId === lessonId)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }

  if (loading) {
    return (
      <Card className="h-fit">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Innehåll</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center gap-3 p-2">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-1 ml-[9px] pl-5">
                  {[...Array(4)].map((__, j) => (
                    <Skeleton key={j} className="h-8 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Innehåll</CardTitle>
          {courseProgress && (
            <Badge
              variant="secondary"
              className={`text-xs ${hideMobileProgress ? 'hidden lg:inline-flex' : ''}`}
            >
              {courseProgress.completedLessons}/{courseProgress.totalLessons}
            </Badge>
          )}
        </div>

        {/* Progress bar - Hidden on mobile when hideMobileProgress is true */}
        {courseProgress && (
          <div className={`mt-3 space-y-1 ${hideMobileProgress ? 'hidden lg:block' : ''}`}>
            <div className="w-full h-2 rounded-full bg-orange-50 dark:bg-orange-950">
              <div
                className="h-2 rounded-full bg-orange-400"
                style={{
                  width: `${courseProgress.progressPercentage || 0}%`,
                  transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {modules
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((module, moduleIndex) => (
            <div key={module.id}>
              {/* Module Header */}
              <div className="flex items-center gap-3 p-2">
                <div className="flex-shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary">{moduleIndex + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm leading-tight flex items-center gap-2">
                    {module.title}
                    {courseProgress?.modulesProgress?.some(
                      (mp) => mp.moduleId === module.id && mp.completed,
                    ) && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  </h3>
                </div>
              </div>

              {/* Ordered items: lessons and quizzes per module.contents */}
              <div className="space-y-0.5 mt-1 border-l-2 border-muted/50 ml-[9px] pl-5">
                {(module.orderedItems && module.orderedItems.length > 0
                  ? module.orderedItems
                  : ([
                      ...module.lessons.map((lesson) => ({
                        type: 'lesson' as const,
                        id: lesson.id,
                        lesson,
                      })),
                      ...((module.quizzes || []).map((quiz) => ({
                        type: 'quiz' as const,
                        id: quiz.id,
                        quiz,
                      })) as any[]),
                    ] as const)
                ).map((entry: any) => {
                  if (entry.type === 'lesson') {
                    const lesson = entry.lesson as CourseLesson
                    const isFree = lesson.isFree || false
                    const isActive = lesson.id === activeLessonId
                    // Allow access if: user has purchased, OR (lesson is free AND user is authenticated)
                    const canAccess = userHasAccess || (isFree && !!authUser)
                    const progress = getLessonProgress(lesson.id)
                    const isCompleted = progress?.isCompleted || false

                    return (
                      <button
                        key={`lesson-${lesson.id}`}
                        onClick={() => onItemClick(module.id, { type: 'lesson', id: lesson.id })}
                        aria-disabled={!canAccess}
                        className={cn(
                          'w-full text-left p-2 rounded-md transition-all duration-200 group',
                          'hover:bg-muted active:scale-[0.99]',
                          isActive && 'bg-primary/10',
                          !canAccess && 'cursor-pointer',
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex-shrink-0">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : canAccess ? (
                              <Circle className="h-4 w-4 text-muted-foreground/50" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'text-sm font-medium truncate',
                                  isActive && 'text-primary',
                                  !canAccess && 'text-muted-foreground',
                                )}
                              >
                                {lesson.title}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-shrink-0">
                            {lesson.muxData?.duration && (
                              <span className="hidden sm:block">
                                {formatDuration(lesson.muxData.duration)}
                              </span>
                            )}
                            {getLessonIcon(lesson)}
                          </div>
                        </div>
                      </button>
                    )
                  }
                  // quiz entry
                  const quiz = entry.quiz as { id: number | string; title: string }
                  const qIdNum = Number((quiz as any).id)
                  const isActiveQuiz = qIdNum === activeQuizId
                  const isQuizFree = (quiz as any).isFree || false
                  // Allow access if: user has purchased, OR (quiz is free AND user is authenticated)
                  const canAccessQuiz = userHasAccess || (isQuizFree && !!authUser)
                  const isQuizCompleted = !!courseProgress?.completedQuizzes?.some(
                    (qid) => Number(qid) === qIdNum,
                  )
                  return (
                    <button
                      key={`quiz-${qIdNum}`}
                      onClick={() => onItemClick(module.id, { type: 'quiz', id: qIdNum })}
                      aria-disabled={!canAccessQuiz}
                      className={cn(
                        'w-full text-left p-2 rounded-md transition-all duration-200 group',
                        'hover:bg-muted active:scale-[0.99]',
                        isActiveQuiz && 'bg-primary/10',
                        !canAccessQuiz && 'cursor-pointer',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex-shrink-0">
                          {isQuizCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : canAccessQuiz ? (
                            <Circle className="h-4 w-4 text-muted-foreground/50" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground/50" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-medium truncate',
                                isActiveQuiz && 'text-primary',
                                !canAccessQuiz && 'text-muted-foreground',
                              )}
                            >
                              {quiz.title}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-shrink-0">
                          <HelpCircle className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
