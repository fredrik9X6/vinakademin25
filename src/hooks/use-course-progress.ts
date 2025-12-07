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

// Local storage key for session participant progress
const getSessionProgressKey = (courseId: string | number) => `session-progress-${courseId}`

export function useCourseProgress(courseId: string | number, isGuestMode: boolean = false) {
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Local progress for session participants (stored in localStorage)
  const [localCompletedLessons, setLocalCompletedLessons] = useState<Set<number>>(new Set())
  const [localCompletedQuizzes, setLocalCompletedQuizzes] = useState<Set<number>>(new Set())

  // Load local progress from localStorage for guest mode
  useEffect(() => {
    if (isGuestMode && courseId) {
      try {
        const stored = localStorage.getItem(getSessionProgressKey(courseId))
        if (stored) {
          const data = JSON.parse(stored)
          setLocalCompletedLessons(new Set(data.completedLessons || []))
          setLocalCompletedQuizzes(new Set(data.completedQuizzes || []))
        }
      } catch (err) {
        console.error('Error loading local progress:', err)
      }
    }
  }, [courseId, isGuestMode])

  // Save local progress to localStorage for guest mode
  const saveLocalProgress = useCallback(
    (lessons: Set<number>, quizzes: Set<number>) => {
      if (isGuestMode && courseId) {
        try {
          localStorage.setItem(
            getSessionProgressKey(courseId),
            JSON.stringify({
              completedLessons: Array.from(lessons),
              completedQuizzes: Array.from(quizzes),
            }),
          )
        } catch (err) {
          console.error('Error saving local progress:', err)
        }
      }
    },
    [courseId, isGuestMode],
  )

  // Fetch initial progress
  const fetchProgress = useCallback(async () => {
    if (!courseId) return

    // For guest/session participants, use local progress only
    if (isGuestMode) {
      setLoading(false)
      // Create a minimal progress object for guests
      setProgress({
        totalLessons: 0,
        completedLessons: localCompletedLessons.size,
        progressPercentage: 0,
        lessonProgress: Array.from(localCompletedLessons).map((lessonId) => ({
          lessonId,
          isCompleted: true,
        })),
        status: 'in-progress',
        completedQuizzes: Array.from(localCompletedQuizzes),
      })
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
  }, [courseId, isGuestMode, localCompletedLessons, localCompletedQuizzes])

  // Update lesson completion
  const updateLessonProgress = useCallback(
    async (lessonId: number, isCompleted: boolean, videoProgress?: number) => {
      if (!courseId) return

      // For guest/session participants, use local storage
      if (isGuestMode) {
        setLocalCompletedLessons((prev) => {
          const newSet = new Set(prev)
          if (isCompleted) {
            newSet.add(lessonId)
          } else {
            newSet.delete(lessonId)
          }
          saveLocalProgress(newSet, localCompletedQuizzes)
          return newSet
        })

        // Update progress state for UI
        setProgress((prev) => {
          const lessonProgress = prev?.lessonProgress || []
          const existingIndex = lessonProgress.findIndex((p) => p.lessonId === lessonId)
          const newLessonProgress =
            existingIndex >= 0
              ? lessonProgress.map((p) => (p.lessonId === lessonId ? { ...p, isCompleted } : p))
              : [...lessonProgress, { lessonId, isCompleted }]

          return {
            totalLessons: prev?.totalLessons || 0,
            completedLessons: newLessonProgress.filter((p) => p.isCompleted).length,
            progressPercentage: prev?.progressPercentage || 0,
            lessonProgress: newLessonProgress,
            status: 'in-progress',
            completedQuizzes: prev?.completedQuizzes || [],
          }
        })

        if (isCompleted) {
          toast.success('Moment markerat som slutfört!')
        }
        return
      }

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
          toast.success('Moment markerat som slutfört!')
        }
      } catch (err) {
        console.error('Error updating lesson progress:', err)
        // Don't show error toast for guest users
        if (!isGuestMode) {
          toast.error('Kunde inte uppdatera framsteg')
        }
      }
    },
    [courseId, isGuestMode, localCompletedQuizzes, saveLocalProgress],
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
      // For guest mode, check local state
      if (isGuestMode) {
        const isCurrentlyCompleted = localCompletedLessons.has(lessonId)
        updateLessonProgress(lessonId, !isCurrentlyCompleted)
        return
      }
      const lessonProgress = progress?.lessonProgress.find((p) => p.lessonId === lessonId)
      const isCurrentlyCompleted = lessonProgress?.isCompleted || false
      updateLessonProgress(lessonId, !isCurrentlyCompleted)
    },
    [progress, updateLessonProgress, isGuestMode, localCompletedLessons],
  )

  // Get progress for a specific lesson
  const getLessonProgress = useCallback(
    (lessonId: number): LessonProgress | undefined => {
      // For guest mode, check local state
      if (isGuestMode) {
        return {
          lessonId,
          isCompleted: localCompletedLessons.has(lessonId),
        }
      }
      return progress?.lessonProgress.find((p) => p.lessonId === lessonId)
    },
    [progress, isGuestMode, localCompletedLessons],
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
      // For guest mode, check local state
      if (isGuestMode) {
        return localCompletedQuizzes.has(quizId)
      }
      return !!progress?.completedQuizzes?.includes(quizId)
    },
    [progress, isGuestMode, localCompletedQuizzes],
  )

  // Mark quiz as completed (for guest mode)
  const markQuizCompleted = useCallback(
    (quizId: number) => {
      if (isGuestMode) {
        setLocalCompletedQuizzes((prev) => {
          const newSet = new Set(prev)
          newSet.add(quizId)
          saveLocalProgress(localCompletedLessons, newSet)
          return newSet
        })

        // Update progress state for UI
        setProgress((prev) => ({
          totalLessons: prev?.totalLessons || 0,
          completedLessons: prev?.completedLessons || 0,
          progressPercentage: prev?.progressPercentage || 0,
          lessonProgress: prev?.lessonProgress || [],
          status: 'in-progress',
          completedQuizzes: [...(prev?.completedQuizzes || []), quizId],
        }))
      }
    },
    [isGuestMode, localCompletedLessons, saveLocalProgress],
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
    markQuizCompleted,
    getProgressPercentage,
    getCompletionStatus,
    getNextIncompleteItem,
    getQuizCount,
  }
}
