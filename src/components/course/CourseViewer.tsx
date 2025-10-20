'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronRight,
  Play,
  FileText,
  CheckCircle,
  Clock,
  Lock,
  User,
  BookOpen,
  Award,
} from 'lucide-react'
import MuxPlayer from '@mux/mux-player-react'
import CourseTableOfContents from './CourseTableOfContents'
import { useCourseProgress } from '@/hooks/use-course-progress'

interface ModuleWithLessons {
  id: number
  title: string
  description: string
  order: number
  lessons: Array<{
    id: number
    title: string
    description?: string
    videoProvider: 'none' | 'mux' | 'youtube' | 'vimeo'
    muxData?: {
      assetId?: string
      playbackId?: string
      status?: 'preparing' | 'ready' | 'errored'
      duration?: number
      aspectRatio?: string
    }
    videoUrl?: string
    order: number
    status: 'draft' | 'published'
    isFree?: boolean // Add free lesson indicator
  }>
  quizzes?: Array<{
    id: number
    title: string
    description?: any
    status?: string
  }>
}

interface CourseViewerProps {
  course: {
    id: number
    title: string
    description: string
    modules: ModuleWithLessons[]
  }
  onLessonChange?: (moduleId: string, lessonId: string) => void
  onProgressUpdate?: (progress: any) => void
  selectedLessonId?: number
  userHasAccess?: boolean // Add user access check
}

export default function CourseViewer({
  course,
  onLessonChange,
  onProgressUpdate,
  selectedLessonId,
  userHasAccess = false,
}: CourseViewerProps) {
  const [activeModuleId, setActiveModuleId] = useState<number>(course.modules[0]?.id)
  const [activeLessonId, setActiveLessonId] = useState<number>(
    selectedLessonId || course.modules[0]?.lessons[0]?.id,
  )

  // Use course progress hook
  const {
    progress: courseProgress,
    loading: progressLoading,
    markLessonCompleted,
    isLessonCompleted,
  } = useCourseProgress(course.id)

  // Calculate course statistics
  const totalLessons = course.modules.reduce((total, module) => {
    // Count lessons from module.contents if available, otherwise from lessons array
    if (module.contents && Array.isArray(module.contents)) {
      return total + module.contents.length
    }
    return total + (module.lessons?.length || 0)
  }, 0)

  const totalDuration = course.modules.reduce(
    (total, module) =>
      total +
      (module.lessons?.reduce(
        (moduleTotal, lesson) => moduleTotal + (lesson.muxData?.duration || 0),
        0,
      ) || 0),
    0,
  )

  const freeLessons = course.modules.reduce(
    (total, module) => total + (module.lessons?.filter((lesson) => lesson.isFree).length || 0),
    0,
  )

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getCurrentLesson = () => {
    for (const module of course.modules) {
      const lesson = module.lessons.find((l) => l.id === activeLessonId)
      if (lesson) return { lesson, module }
    }
    return null
  }

  const currentLesson = getCurrentLesson()
  const isLessonFree = currentLesson?.lesson.isFree || false
  const canAccessLesson = userHasAccess || isLessonFree

  const handleItemClick = (moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => {
    if (item.type === 'lesson') {
      const lesson = course.modules
        .find((m) => m.id === moduleId)
        ?.lessons.find((l) => l.id === item.id)
      const isFree = lesson?.isFree || (lesson?.order || 0) <= 2

      if (userHasAccess || isFree) {
        setActiveModuleId(moduleId)
        setActiveLessonId(item.id)
        onLessonChange?.(moduleId.toString(), item.id.toString())
      }
    } else {
      // In overview viewer, ignore quiz navigation (handled in full lesson page)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Course Header */}
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-xl text-muted-foreground max-w-3xl">{course.description}</p>
        </div>

        {/* Course Stats */}
        <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>Beginner</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(totalDuration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{totalLessons} Lessons</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span>{freeLessons} Free Lessons</span>
          </div>
        </div>

        {/* Access Status */}
        {!userHasAccess && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Premium Course</p>
                  <p className="text-sm text-amber-700">
                    Get full access to all lessons and course materials
                  </p>
                </div>
              </div>
              <Button className="bg-amber-600 hover:bg-amber-700">Upgrade Now</Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                {progressLoading ? (
                  <div className="w-full h-full">
                    <Skeleton className="w-full h-full rounded-none" />
                  </div>
                ) : canAccessLesson && currentLesson?.lesson ? (
                  <>
                    {currentLesson.lesson.videoProvider === 'mux' &&
                    currentLesson.lesson.muxData?.playbackId &&
                    currentLesson.lesson.muxData.status === 'ready' ? (
                      <MuxPlayer
                        playbackId={currentLesson.lesson.muxData.playbackId}
                        metadata={{
                          video_title: currentLesson.lesson.title,
                          video_id: currentLesson.lesson.id.toString(),
                        }}
                        streamType="on-demand"
                        className="w-full h-full"
                      />
                    ) : currentLesson.lesson.videoProvider === 'youtube' &&
                      currentLesson.lesson.videoUrl ? (
                      <iframe
                        src={currentLesson.lesson.videoUrl}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white">
                        <div className="text-center">
                          <Play className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p>Video preparing...</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Lock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Premium Content</p>
                      <p className="text-sm opacity-75">Upgrade to access this lesson</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lesson Info */}
          {currentLesson && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">{currentLesson.lesson.title}</h2>
                {!isLessonFree && (
                  <Badge variant="secondary">
                    <Lock className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
                {isLessonFree && <Badge variant="default">Free</Badge>}
              </div>
              {currentLesson.lesson.description && (
                <p className="text-muted-foreground">{currentLesson.lesson.description}</p>
              )}

              {/* Mark Complete Button */}
              {canAccessLesson && (
                <div className="flex items-center gap-4">
                  <Button
                    variant={isLessonCompleted(activeLessonId) ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => markLessonCompleted(activeLessonId)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isLessonCompleted(activeLessonId) ? 'Slutförd' : 'Markera som slutförd'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table of Contents */}
        <div className="space-y-6">
          <CourseTableOfContents
            modules={course.modules}
            courseProgress={courseProgress || undefined}
            userHasAccess={userHasAccess}
            activeLessonId={activeLessonId}
            onItemClick={handleItemClick}
            loading={progressLoading}
          />

          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Completed</span>
                  <span>0/{totalLessons}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }} />
                </div>
                <div className="text-xs text-muted-foreground">
                  {userHasAccess ? 'Full access unlocked' : `${freeLessons} free lessons available`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
