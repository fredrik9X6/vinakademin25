'use client'

import * as React from 'react'
import SessionView from '@/components/course/SessionView'
import type { TastingPlan, CourseSession } from '@/payload-types'

interface PlanSessionShellProps {
  plan: TastingPlan
  session: CourseSession
  isHost: boolean
  sessionId: string
}

/**
 * Thin client wrapper that mounts SessionView for plan-driven sessions.
 *
 * SessionView's first prop is `course: any` and the lesson/quiz/module props
 * are course-only. We pass `null`/`undefined` — the plan-mode branch inside
 * SessionView fires on `session.course` being null and short-circuits before
 * any of those values are read.
 *
 * The `plan` prop is accepted by the shell for symmetry with the page-level
 * call site (and to keep future plan-specific extensions colocated), but
 * SessionView reads the plan off `session.tastingPlan` directly.
 */
export function PlanSessionShell({ plan: _plan, session, isHost, sessionId }: PlanSessionShellProps) {
  return (
    <SessionView
      course={null}
      selectedLesson={undefined}
      selectedQuiz={undefined}
      selectedModule={undefined}
      sessionId={sessionId}
      isHost={isHost}
      session={session}
    />
  )
}
