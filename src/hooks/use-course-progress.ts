'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

interface LessonProgress {
  lessonId: number
  isCompleted: boolean
  lastWatchedAt?: string
  progress?: number
}

interface CourseProgress {
  totalLessons: number
  completedLessons: number
  progressPercentage: number
  lessonProgress: LessonProgress[]
  status: string
  enrolledAt?: string
  lastAccessedAt?: string
  completedQuizzes?: number[]
  modulesProgress?: Array<{
    moduleId: number
    totalItems: number
    completedItems: number
    completed: boolean
  }>
  nextIncompleteItem?: { type: 'lesson' | 'quiz'; id: number } | null
  quizCount?: number
}

export function useCourseProgress(courseId: string | number, isGuestMode: boolean = false) {
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial progress
  const fetchProgress = useCallback(async () => {
    if (!courseId) return

    // Skip progress tracking for guest/session participants
    if (isGuestMode) {
      setLoading(false)
      setProgress(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/progress?courseId=${courseId}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - this is expected for demo/preview
          setProgress(null)
          return
        }
        throw new Error('Failed to fetch progress')
      }

      const data = await response.json()
      setProgress(data)
    } catch (err) {
      console.error('Error fetching course progress:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch progress')
    } finally {
      setLoading(false)
    }
  }, [courseId, isGuestMode])

  // Update lesson completion
  const updateLessonProgress = useCallback(
    async (lessonId: number, isCompleted: boolean, videoProgress?: number) => {
      if (!courseId) return

      // Skip progress tracking for guest/session participants
      if (isGuestMode) return

      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            lessonId,
            isCompleted,
            progress: videoProgress,
          }),
        })

        if (!response.ok) {
          if (response.status === 401) {
            // Silently skip for unauthenticated users (guest mode)
            return
          }
          throw new Error('Failed to update progress')
        }

        const data = await response.json()

        // Update local state
        setProgress((prev) => {
          if (!prev) return null

          const updatedLessonProgress = prev.lessonProgress.map((lesson) =>
            lesson.lessonId === lessonId
              ? { ...lesson, isCompleted, progress: videoProgress || (isCompleted ? 100 : 0) }
              : lesson,
          )

          return {
            ...prev,
            ...data.progress,
            lessonProgress: updatedLessonProgress,
          }
        })

        // Show success message
        if (isCompleted) {
          toast.success('Lektion markerad som slutförd!')
        }
      } catch (err) {
        console.error('Error updating lesson progress:', err)
        // Don't show error toast for guest users
        if (!isGuestMode) {
          toast.error('Kunde inte uppdatera framsteg')
        }
      }
    },
    [courseId, isGuestMode],
  )

  // Mark lesson as completed
  const markLessonCompleted = useCallback(
    (lessonId: number) => {
      updateLessonProgress(lessonId, true)
    },
    [updateLessonProgress],
  )

  // Mark lesson as incomplete
  const markLessonIncomplete = useCallback(
    (lessonId: number) => {
      updateLessonProgress(lessonId, false)
    },
    [updateLessonProgress],
  )

  // Toggle lesson completion
  const toggleLessonCompletion = useCallback(
    (lessonId: number) => {
      const lessonProgress = progress?.lessonProgress.find((p) => p.lessonId === lessonId)
      const isCurrentlyCompleted = lessonProgress?.isCompleted || false
      updateLessonProgress(lessonId, !isCurrentlyCompleted)
    },
    [progress, updateLessonProgress],
  )

  // Get progress for a specific lesson
  const getLessonProgress = useCallback(
    (lessonId: number): LessonProgress | undefined => {
      return progress?.lessonProgress.find((p) => p.lessonId === lessonId)
    },
    [progress],
  )

  // Check if lesson is completed
  const isLessonCompleted = useCallback(
    (lessonId: number): boolean => {
      return getLessonProgress(lessonId)?.isCompleted || false
    },
    [getLessonProgress],
  )

  // Get overall progress percentage
  const getProgressPercentage = useCallback((): number => {
    return progress?.progressPercentage || 0
  }, [progress])

  // Get completion status
  const getCompletionStatus = useCallback((): string => {
    return progress?.status || 'not-started'
  }, [progress])

  // Check if quiz is completed (passed)
  const isQuizCompleted = useCallback(
    (quizId: number): boolean => {
      return !!progress?.completedQuizzes?.includes(quizId)
    },
    [progress],
  )

  const getNextIncompleteItem = useCallback(() => progress?.nextIncompleteItem ?? null, [progress])
  const getQuizCount = useCallback(() => progress?.quizCount ?? 0, [progress])

  // Load progress on mount
  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  return {
    progress,
    loading,
    error,
    fetchProgress,
    updateLessonProgress,
    markLessonCompleted,
    markLessonIncomplete,
    toggleLessonCompletion,
    getLessonProgress,
    isLessonCompleted,
    isQuizCompleted,
    getProgressPercentage,
    getCompletionStatus,
    getNextIncompleteItem,
    getQuizCount,
  }
}
