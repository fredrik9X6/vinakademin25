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
} from 'lucide-react'
import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import CourseTableOfContents from './CourseTableOfContents'
// Removed mock preview component
import QuizAttemptRunner from './QuizAttemptRunner'
import { useRouter } from 'next/navigation'
import { useCourseProgress } from '@/hooks/use-course-progress'
import { useMemo } from 'react'
import { getFlattenedCourseItems } from '@/lib/course-utils'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'

interface CourseQuizViewerProps {
  course: any
  module: any
  quiz: any
  userHasAccess?: boolean
}

export default function CourseQuizViewer({
  course,
  module,
  quiz,
  userHasAccess = false,
}: CourseQuizViewerProps) {
  const router = useRouter()
  const [isTocOpen, setIsTocOpen] = useState(false)

  // Check if quiz is free - but authentication is still required
  const isQuizFree = quiz.isFree || false
  const canAccessQuiz = userHasAccess || isQuizFree

  const {
    progress: courseProgress,
    loading: progressLoading,
    fetchProgress,
  } = useCourseProgress(course.id)

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

  const navigateToItem = (item: { type: 'lesson' | 'quiz'; id: number }) => {
    if (item.type === 'lesson') {
      router.push(`/vinprovningar/${course.slug || course.id}?lesson=${item.id}`)
    } else {
      router.push(`/vinprovningar/${course.slug || course.id}?quiz=${item.id}`)
    }
  }

  const goToNext = () => {
    if (currentItemIndex < allItems.length - 1) {
      navigateToItem(allItems[currentItemIndex + 1])
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
            {/* Breadcrumbs and Title */}
            <div className="space-y-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/vinprovningar/${course.slug || course.id}`}>
                      Kurs
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/vinprovningar/${course.slug || course.id}`}>
                      {course.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink href={`/vinprovningar/${course.slug || course.id}`}>
                      {module.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Quiz</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{module.title}</Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" /> Quiz
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold">{quiz.title}</h1>
                </div>
              </div>

              {/* end breadcrumbs/title wrapper */}
            </div>

            {/* Quiz Viewer */}
            {canAccessQuiz ? (
              <div className="space-y-6">
                <QuizAttemptRunner
                  quiz={quiz}
                  onPassed={async () => {
                    try {
                      await fetchProgress()
                    } catch {}
                    // Prefer next lesson in same module; fallback to overview if none
                    if (nextItem && nextItem.type === 'lesson') {
                      router.push(
                        `/vinprovningar/${course.slug || course.id}?lesson=${nextItem.id}`,
                      )
                    } else {
                      const target = `/vinprovningar/${course.slug || course.id}?t=${Date.now()}`
                      router.push(target)
                    }
                    try {
                      // @ts-ignore
                      router.refresh?.()
                    } catch {}
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
              className={`${isTocOpen ? 'block animate-in-from-top-2 fade-in duration-300' : 'hidden'} lg:block space-y-6 lg:sticky lg:top-24 lg:self-start transition-all`}
            >
              <CourseTableOfContents
                modules={course.modules as any}
                courseProgress={courseProgress || undefined}
                userHasAccess={userHasAccess}
                activeQuizId={quiz.id}
                onItemClick={handleItemClick}
                loading={progressLoading}
                hideMobileProgress={true}
              />
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
          <Button
            variant="default"
            size="lg"
            onClick={goToNext}
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
