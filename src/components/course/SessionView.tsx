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
import { Crown, LogOut } from 'lucide-react'

interface SessionViewProps {
  course: any
  selectedLesson?: any
  selectedQuiz?: any
  selectedModule?: any
  sessionId: string
  /** True when the viewer is the session host. Hides Follow-host toggle, disables auto-advance. */
  isHost?: boolean
}

/**
 * Stripped session-mode UI for active session participants. Replaces the
 * marketing chrome of CourseOverview. Renders the lesson player (or quiz
 * viewer) with the live roster docked beneath the Innehåll TOC sidebar.
 * Mounts RealtimeSync once so the SSE stream is open while this view is on screen.
 *
 * For hosts: no Follow-host toggle (they drive the cohort), no auto-advance,
 * different lobby helper copy. For followers: auto-advances to the host's
 * current lesson when followingHost is true (covers both the lobby and the
 * in-lesson cases).
 */
export default function SessionView({
  course,
  selectedLesson,
  selectedQuiz,
  selectedModule,
  sessionId,
  isHost = false,
}: SessionViewProps) {
  const router = useRouter()
  const { leaveSession, followingHost, hostCurrentLessonId } = useActiveSession()

  // Build a map of contentItemId → title for the roster display.
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

  // Followers auto-advance to the host's current item — works in BOTH the
  // lobby (no lesson selected) AND the in-lesson cases. Skipped for hosts
  // (they drive the cohort) and when Roam toggle is off.
  useEffect(() => {
    if (isHost) return
    if (!followingHost) return
    if (hostCurrentLessonId == null) return
    const currentItemId = selectedLesson?.id ?? selectedQuiz?.id ?? null
    if (currentItemId === hostCurrentLessonId) return
    router.push(
      `/vinprovningar/${course.slug || course.id}?lesson=${hostCurrentLessonId}&session=${sessionId}`,
    )
  }, [
    isHost,
    followingHost,
    hostCurrentLessonId,
    selectedLesson?.id,
    selectedQuiz?.id,
    course.slug,
    course.id,
    sessionId,
    router,
  ])

  const handleLeave = async () => {
    await leaveSession()
    router.push('/vinprovningar')
  }

  const handleItemClick = (_moduleId: number, item: { type: 'lesson' | 'quiz'; id: number }) => {
    const param = item.type === 'lesson' ? `lesson=${item.id}` : `quiz=${item.id}`
    router.push(`/vinprovningar/${course.slug || course.id}?${param}&session=${sessionId}`)
  }

  const lobbyHelperText = isHost
    ? 'Välj ett moment nedan för att starta gruppsessionen — alla som följer dig hoppar med.'
    : 'Välj ett moment nedan för att börja, eller följ med när värden navigerar.'

  return (
    <div className="min-h-screen bg-background">
      <RealtimeSync sessionId={sessionId} />

      {/* Compact header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-lg sm:text-xl truncate">{course.title}</h1>
          </div>
          {isHost ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-300/40 bg-brand-300/10 px-3 py-1.5 text-xs font-medium text-brand-400">
              <Crown className="h-3.5 w-3.5" />
              Du är värden
            </span>
          ) : (
            <FollowHostToggle />
          )}
          <Button variant="outline" size="sm" onClick={handleLeave}>
            <LogOut className="mr-1.5 h-3.5 w-3.5" />
            Lämna
          </Button>
        </div>
      </header>

      {/* Main column — roster lives in the LessonViewer/CourseQuizViewer sidebar
       * via the sidebarExtra prop, or below the TOC in the lobby state. */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {selectedLesson ? (
          <LessonViewer
            course={course}
            lesson={selectedLesson}
            module={selectedModule}
            userHasAccess={true}
            userPurchasedAccess={false}
            sessionId={sessionId}
            isSessionParticipant
            isSessionHost={isHost}
            sidebarExtra={<SessionRoster lessonTitleById={lessonTitleById} />}
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
            isSessionHost={isHost}
            sidebarExtra={<SessionRoster lessonTitleById={lessonTitleById} />}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
                {lobbyHelperText}
              </div>
              <CourseTableOfContents
                modules={course.modules}
                userHasAccess
                onItemClick={handleItemClick}
              />
            </div>
            <aside>
              <SessionRoster lessonTitleById={lessonTitleById} />
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
