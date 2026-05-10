'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveSession } from '@/context/SessionContext'
import LessonViewer from './LessonViewer'
import CourseQuizViewer from './CourseQuizViewer'
import CourseTableOfContents from './CourseTableOfContents'
import { SessionRoster } from './SessionRoster'
import { FollowHostToggle } from './FollowHostToggle'
import { RealtimeSync } from './RealtimeSync'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface SessionViewProps {
  course: any
  selectedLesson?: any
  selectedQuiz?: any
  selectedModule?: any
  sessionId: string
}

/**
 * Stripped session-mode UI for active session participants. Replaces the
 * marketing chrome of CourseOverview. Renders the lesson player (or quiz
 * viewer), the roster, and the Follow-host toggle. Mounts RealtimeSync once
 * so the live stream is open while this view is on screen.
 */
export default function SessionView({
  course,
  selectedLesson,
  selectedQuiz,
  selectedModule,
  sessionId,
}: SessionViewProps) {
  const router = useRouter()
  const { leaveSession } = useActiveSession()

  // Build a map of lessonId → title for the roster display.
  const lessonTitleById = useMemo(() => {
    const m = new Map<number, string>()
    for (const mod of course.modules || []) {
      for (const l of mod.lessons || []) {
        if (typeof l?.id === 'number' && typeof l?.title === 'string') m.set(l.id, l.title)
      }
      for (const q of mod.quizzes || []) {
        if (typeof q?.id === 'number' && typeof q?.title === 'string') m.set(q.id, q.title)
      }
    }
    return m
  }, [course])

  // Heartbeat: every 30s POST an empty participant-state to keep lastActivityAt fresh.
  useEffect(() => {
    if (!sessionId) return
    const ping = () =>
      void fetch(`/api/sessions/${encodeURIComponent(sessionId)}/participant-state`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    ping() // initial
    const id = setInterval(ping, 30_000)
    return () => clearInterval(id)
  }, [sessionId])

  // When the participant lands on a specific lesson/quiz, push their
  // currentLessonId so the roster reflects it.
  useEffect(() => {
    if (!sessionId) return
    const id = selectedLesson?.id ?? selectedQuiz?.id ?? null
    if (id == null) return
    void fetch(`/api/sessions/${encodeURIComponent(sessionId)}/participant-state`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentLessonId: id }),
    })
  }, [sessionId, selectedLesson?.id, selectedQuiz?.id])

  const handleLeave = async () => {
    await leaveSession()
    router.push('/vinprovningar')
  }

  const handleItemClick = (_moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => {
    const param = item.type === 'lesson' ? `lesson=${item.id}` : `quiz=${item.id}`
    router.push(`/vinprovningar/${course.slug || course.id}?${param}&session=${sessionId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <RealtimeSync sessionId={sessionId} />

      {/* Compact header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-lg sm:text-xl truncate">{course.title}</h1>
          </div>
          <FollowHostToggle />
          <Button variant="outline" size="sm" onClick={handleLeave}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Lämna
          </Button>
        </div>
      </header>

      {/* Main grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        {/* Lesson / quiz player */}
        <div className="min-w-0">
          {selectedLesson ? (
            <LessonViewer
              course={course}
              lesson={selectedLesson}
              module={selectedModule}
              userHasAccess={true}
              userPurchasedAccess={false}
              sessionId={sessionId}
              isSessionParticipant
            />
          ) : selectedQuiz ? (
            <CourseQuizViewer
              course={course}
              quiz={selectedQuiz}
              module={selectedModule}
              userHasAccess={true}
              userPurchasedAccess={false}
              sessionId={sessionId}
              isSessionParticipant
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                Välj ett moment nedan för att börja, eller följ med när värden navigerar.
              </div>
              <CourseTableOfContents
                modules={course.modules}
                userHasAccess
                onItemClick={handleItemClick}
              />
            </div>
          )}
        </div>

        {/* Right rail: roster */}
        <aside className="space-y-4">
          <SessionRoster lessonTitleById={lessonTitleById} />
        </aside>
      </div>
    </div>
  )
}
