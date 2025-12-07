'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
// import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Clock,
  BookOpen,
  User,
  Play,
  Lock,
  CheckCircle,
  Star,
  Award,
  Users,
  FileText,
  Wine,
  HelpCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import CourseTableOfContents from './CourseTableOfContents'
import { useCourseProgress } from '@/hooks/use-course-progress'
import { toast } from 'sonner'
import { PurchaseButton, CoursePurchasePanel } from '@/components/payment'
import { Skeleton } from '@/components/ui/skeleton'
import StartSessionButton from './StartSessionButton'
import { getFlattenedCourseItems } from '@/lib/course-utils'
import MuxPlayer from '@mux/mux-player-react'
import Image from 'next/image'
import { SessionParticipantsDisplay } from './SessionParticipantsDisplay'
import { useActiveSession } from '@/context/SessionContext'
import { RichTextRenderer } from '@/components/ui/rich-text-renderer'
import { useAuth } from '@/context/AuthContext'

interface CourseOverviewProps {
  course: {
    id: number
    title: string
    slug?: string
    description?: string
    fullDescription?: any
    shortDescription?: string
    level?: string
    price?: number
    instructor?: {
      firstName?: string
      lastName?: string
    }
    featuredImage?: {
      url?: string
      alt?: string
    }
    previewVideoProvider?: string
    previewMuxData?: {
      playbackId?: string
      status?: string
      duration?: number
      aspectRatio?: string
    }
    modules: Array<{
      id: number
      title: string
      description?: string
      order?: number
      lessons: Array<{
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
      }>
    }>
  }
  userHasAccess?: boolean
  isSessionParticipant?: boolean
  sessionId?: string
}

/**
 * Validates and returns a valid image URL, or null if invalid
 * Handles cases where media files have corrupted or missing filenames
 */
function getValidImageUrl(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null
  // Check for invalid filenames (just a dash, empty, or undefined in path)
  if (url.includes('/-.') || url.endsWith('/-') || url.includes('undefined')) {
    console.warn('Invalid image URL detected:', url)
    return null
  }
  return url
}

export default function CourseOverview({
  course,
  userHasAccess = false,
  isSessionParticipant = false,
  sessionId,
}: CourseOverviewProps) {
  const router = useRouter()
  const { progress: courseProgress, loading: progressLoading } = useCourseProgress(course.id)
  const { getNextIncompleteItem, getQuizCount } = useCourseProgress(course.id)
  const { activeSession } = useActiveSession()
  const { user: authUser } = useAuth()

  // Use session from props or from context (for persistent navigation)
  const effectiveSessionId =
    sessionId || (activeSession?.courseId === course.id ? activeSession.sessionId : null)

  // Count ALL content items (lessons + quizzes) as "moment"
  const totalMoment = course.modules.reduce((total, module) => {
    // Count items from module.contents if available, otherwise from lessons + quizzes arrays
    if ((module as any).contents && Array.isArray((module as any).contents)) {
      return total + (module as any).contents.length
    }
    const lessonCount = module.lessons?.length || 0
    const quizCount = ((module as any).quizzes as any[])?.length || 0
    return total + lessonCount + quizCount
  }, 0)

  // Count free items (both lessons AND quizzes)
  const freeLessons = course.modules.reduce((total, module) => {
    const freeLessonsCount = module.lessons?.filter((l) => l.isFree).length || 0
    const freeQuizzesCount = ((module as any).quizzes as any[])?.filter((q) => q.isFree).length || 0
    return total + freeLessonsCount + freeQuizzesCount
  }, 0)

  // Count different content types
  const getContentCounts = () => {
    let videos = 0
    let texts = 0
    let wineReviews = 0
    let quizzes = getQuizCount()

    course.modules.forEach((module) => {
      module.lessons?.forEach((lesson) => {
        if (lesson.lessonType === 'video') {
          videos++
        } else if (lesson.lessonType === 'text') {
          texts++
        } else if (lesson.lessonType === 'wineReview') {
          wineReviews++
        }
        // Mixed type counts as video if it has video, otherwise text
        else if (lesson.lessonType === 'mixed') {
          if (lesson.videoProvider) {
            videos++
          } else {
            texts++
          }
        }
      })
    })

    return { videos, texts, wineReviews, quizzes, total: totalMoment }
  }

  const contentCounts = getContentCounts()

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis'
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
    }).format(price)
  }

  const buildUrl = (base: string) => {
    return effectiveSessionId ? `${base}&session=${effectiveSessionId}` : base
  }

  const handleLessonClick = (moduleId: number, lessonId: number) => {
    // Check if this specific lesson is free
    const lesson = course.modules
      .find((m) => m.id === moduleId)
      ?.lessons.find((l) => l.id === lessonId)

    const isLessonFree = lesson?.isFree || false

    // Require authentication for free lessons - redirect to login if not authenticated
    if (isLessonFree && !authUser) {
      const currentUrl = `/vinprovningar/${course.slug || course.id}?lesson=${lessonId}`
      router.push(`/logga-in?from=${encodeURIComponent(currentUrl)}`)
      toast.info('Du behöver logga in för att prova gratis-lektioner')
      return
    }

    // Allow access if: user has purchased, is session participant, OR lesson is free (authenticated users can access free lessons)
    const canAccess = userHasAccess || isSessionParticipant || (isLessonFree && !!authUser)

    if (!canAccess) {
      const currentUrl = `/vinprovningar/${course.slug || course.id}?lesson=${lessonId}`
      router.push(`/logga-in?from=${encodeURIComponent(currentUrl)}`)
      toast.info('Du behöver köpa kursen för att se detta innehåll')
      return
    }

    // Navigate to the lesson
    router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?lesson=${lessonId}`))
  }

  const continueCourse = () => {
    const next = getNextIncompleteItem()

    // If there's an incomplete item, navigate to it
    if (next) {
      if (next.type === 'lesson') {
        const containing = course.modules.find((m) => m.lessons.some((l) => l.id === next.id))
        if (containing) return handleLessonClick(containing.id, next.id)
      } else if (next.type === 'quiz') {
        router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?quiz=${next.id}`))
        return
      }
    }

    // Otherwise, start from the very first item (lesson or quiz)
    const allItems = getFlattenedCourseItems(course.modules)
    if (allItems.length > 0) {
      const firstItem = allItems[0]
      if (firstItem.type === 'lesson') {
        const containing = course.modules.find((m) => m.lessons.some((l) => l.id === firstItem.id))
        if (containing) {
          handleLessonClick(containing.id, firstItem.id)
        }
      } else if (firstItem.type === 'quiz') {
        router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?quiz=${firstItem.id}`))
      }
    }
  }

  const handleItemClick = (moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => {
    if (item.type === 'lesson') {
      handleLessonClick(moduleId, item.id)
    } else {
      // Handle quiz click - check if quiz is free
      const module = course.modules.find((m) => m.id === moduleId)
      const quiz = (module as any)?.quizzes?.find((q: any) => q.id === item.id)
      const isQuizFree = (quiz as any)?.isFree || false

      // Require authentication for free quizzes - redirect to login if not authenticated
      if (isQuizFree && !authUser) {
        const currentUrl = `/vinprovningar/${course.slug || course.id}?quiz=${item.id}`
        router.push(`/logga-in?from=${encodeURIComponent(currentUrl)}`)
        toast.info('Du behöver logga in för att prova gratis-quiz')
        return
      }

      // Allow access if: user has purchased, is session participant, OR quiz is free (authenticated users can access free quizzes)
      const canAccess = userHasAccess || isSessionParticipant || (isQuizFree && !!authUser)

      if (!canAccess) {
        const currentUrl = `/vinprovningar/${course.slug || course.id}?quiz=${item.id}`
        router.push(`/logga-in?from=${encodeURIComponent(currentUrl)}`)
        toast.info('Du behöver köpa kursen för att se detta innehåll')
        return
      }

      router.push(buildUrl(`/vinprovningar/${course.slug || course.id}?quiz=${item.id}`))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Different layout for non-purchasers vs purchasers/participants */}
      {!userHasAccess && !isSessionParticipant ? (
        /* Non-purchaser header - Side-by-side layout */
        <div className="bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left: Video/Preview */}
              <div className="w-full">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  {course.previewVideoProvider === 'mux' &&
                  course.previewMuxData?.playbackId &&
                  course.previewMuxData?.status === 'ready' ? (
                    <MuxPlayer
                      playbackId={course.previewMuxData.playbackId}
                      metadata={{
                        video_title: `${course.title} - Preview`,
                        video_id: `course-${course.id}-preview`,
                      }}
                      streamType="on-demand"
                      className="w-full h-full"
                      poster={getValidImageUrl(course.featuredImage?.url) || undefined}
                      style={{
                        // Theme Mux Player to use brand orange accents
                        ['--media-accent-color' as any]: '#f97316', // orange-500
                        ['--media-focus-ring-color' as any]: '#f97316',
                        ['--media-controls-background' as any]: 'rgba(0,0,0,0.4)',
                      }}
                    />
                  ) : getValidImageUrl(course.featuredImage?.url) ? (
                    <div className="relative w-full h-full">
                      <Image
                        src={getValidImageUrl(course.featuredImage?.url)!}
                        alt={course.featuredImage?.alt || course.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                        <div className="bg-white/90 rounded-full p-4 shadow-lg">
                          <Play className="w-12 h-12 text-primary" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                      <Play className="w-16 h-16 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Content */}
              <div className="flex flex-col">
                <div className="space-y-6">
                  {/* Badge */}
                  {freeLessons > 0 && (
                    <Badge variant="secondary" className="w-fit uppercase tracking-wide text-xs">
                      {freeLessons} gratis moment
                    </Badge>
                  )}

                  {/* Title */}
                  <h1 className="text-3xl lg:text-5xl font-bold leading-tight">{course.title}</h1>

                  {/* Description */}
                  {course.shortDescription && (
                    <p className="text-base lg:text-lg leading-relaxed">
                      {course.shortDescription}
                    </p>
                  )}

                  {/* Price */}
                  <div className="text-3xl font-bold">{formatPrice(course.price || 0)}</div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <Button onClick={continueCourse} size="lg" className="w-full text-base py-6">
                      Prova gratis
                    </Button>

                    <PurchaseButton
                      course={{
                        id: course.id,
                        title: course.title,
                        description: course.description || '',
                        fullDescription: course.fullDescription || null,
                        price: course.price || 0,
                        slug: course.slug || course.id.toString(),
                        featuredImage: course.featuredImage as any,
                        level:
                          (course.level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
                        duration: totalMoment,
                        instructor: course.instructor as any,
                        updatedAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        _status: 'published',
                      } as any}
                      variant="outline"
                      size="lg"
                      fullWidth
                      showIcon={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Purchaser/Participant header - Simple layout with preview video */
        <div className="bg-background text-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="max-w-4xl space-y-8">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {course.level === 'beginner' && 'Nybörjare'}
                  {course.level === 'intermediate' && 'Medel'}
                  {course.level === 'advanced' && 'Avancerad'}
                  {!course.level && 'Nybörjare'}
                </Badge>
                {isSessionParticipant && (
                  <Badge variant="default" className="gap-1">
                    <Users className="w-3 h-3" />
                    Gruppsession
                  </Badge>
                )}
                {courseProgress?.status === 'completed' && !isSessionParticipant && (
                  <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-3 h-3" />
                    Slutförd
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-medium leading-tight">
                {course.title}
              </h1>

              {course.shortDescription && (
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                  {course.shortDescription}
                </p>
              )}

              {/* Preview Video - Always shown */}
              {course.previewVideoProvider === 'mux' &&
              course.previewMuxData?.playbackId &&
              course.previewMuxData?.status === 'ready' ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <MuxPlayer
                    playbackId={course.previewMuxData.playbackId}
                    metadata={{
                      video_title: `${course.title} - Preview`,
                      video_id: `course-${course.id}-preview`,
                    }}
                    streamType="on-demand"
                    className="w-full h-full"
                    poster={getValidImageUrl(course.featuredImage?.url) || undefined}
                    style={{
                      // Theme Mux Player to use brand orange accents
                      ['--media-accent-color' as any]: '#f97316', // orange-500
                      ['--media-focus-ring-color' as any]: '#f97316',
                      ['--media-controls-background' as any]: 'rgba(0,0,0,0.4)',
                    }}
                  />
                </div>
              ) : getValidImageUrl(course.featuredImage?.url) ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                  <Image
                    src={getValidImageUrl(course.featuredImage?.url)!}
                    alt={course.featuredImage?.alt || course.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
                    <div className="bg-white/90 rounded-full p-4 shadow-lg">
                      <Play className="w-12 h-12 text-primary" />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 flex-shrink-0" />
                  <span>{course.modules.length} moduler</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 flex-shrink-0" />
                  <span>{totalMoment} moment</span>
                </div>
                {freeLessons > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{freeLessons} gratis moment</span>
                  </div>
                )}
                {course.instructor && (
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 flex-shrink-0" />
                    <span>
                      {course.instructor.firstName} {course.instructor.lastName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Course Description */}
            {course.fullDescription && (
              <Card>
                <CardHeader>
                  <CardTitle>Om {course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextRenderer
                    content={course.fullDescription}
                    className="prose-headings:font-semibold prose-headings:text-foreground"
                  />
                </CardContent>
              </Card>
            )}

            {/* Table of Contents */}
            <CourseTableOfContents
              modules={course.modules}
              courseProgress={courseProgress || undefined}
              userHasAccess={userHasAccess || isSessionParticipant}
              onItemClick={handleItemClick}
              loading={progressLoading}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky top-24 self-start">
            {/* Action Buttons - Only render container if there are buttons to show */}
            {(userHasAccess || isSessionParticipant) && (
              <div className="space-y-3">
                {/* Continue/Start Button - Always show for users with access or in session */}
                <Button onClick={continueCourse} className="w-full" size="lg">
                  <Play className="w-5 h-5 mr-2" />
                  {isSessionParticipant ? 'Starta kursen' : 'Fortsätt där du slutade'}
                </Button>

                {/* Completion Page Button - Show when course is completed */}
                {courseProgress?.status === 'completed' &&
                  userHasAccess &&
                  !isSessionParticipant && (
                    <Button
                      onClick={() =>
                        router.push(
                          buildUrl(`/vinprovningar/${course.slug || course.id}?completed=true`),
                        )
                      }
                      variant="secondary"
                      className="w-full"
                      size="lg"
                    >
                      <Award className="w-5 h-5 mr-2" />
                      Visa slutbetyg
                    </Button>
                  )}

                {/* Group Session Button - Only show for authenticated users with access (not session participants) */}
                {userHasAccess && !isSessionParticipant && (
                  <StartSessionButton
                    courseId={course.id}
                    courseTitle={course.title}
                    courseSlug={course.slug}
                  />
                )}
              </div>
            )}

            {/* Course Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detaljer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span>
                      Nivå:{' '}
                      {course.level === 'beginner'
                        ? 'Nybörjare'
                        : course.level === 'intermediate'
                          ? 'Medel'
                          : 'Avancerad'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{contentCounts.total} moment</span>
                  </div>
                  {freeLessons > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <span>{freeLessons} gratis moment</span>
                    </div>
                  )}

                  <Separator className="my-2" />

                  {/* Content breakdown */}
                  <div className="space-y-2">
                    {contentCounts.videos > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Play className="w-4 h-4" />
                        <span>
                          {contentCounts.videos} video{contentCounts.videos !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                    {contentCounts.texts > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>
                          {contentCounts.texts} artikel{contentCounts.texts !== 1 ? 'ar' : ''}
                        </span>
                      </div>
                    )}
                    {contentCounts.quizzes > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <HelpCircle className="w-4 h-4" />
                        <span>
                          {contentCounts.quizzes} quiz{contentCounts.quizzes !== 1 ? 'zes' : ''}
                        </span>
                      </div>
                    )}
                    {contentCounts.wineReviews > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wine className="w-4 h-4" />
                        <span>
                          {contentCounts.wineReviews} vinprovning
                          {contentCounts.wineReviews !== 1 ? 'ar' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Participants - Show when in a group session */}
            {effectiveSessionId && (isSessionParticipant || userHasAccess) && (
              <SessionParticipantsDisplay
                sessionId={effectiveSessionId}
                participantToken={
                  typeof window !== 'undefined'
                    ? localStorage.getItem('participantToken') || undefined
                    : undefined
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
