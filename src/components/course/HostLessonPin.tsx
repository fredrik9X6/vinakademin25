'use client'

import { useActiveSession } from '@/context/SessionContext'
import { Crown } from 'lucide-react'

interface HostLessonPinProps {
  lessonId: number
}

/**
 * Renders a small "Värden är här" badge next to a lesson row in the TOC,
 * but only when the host's current lesson matches `lessonId`. Renders nothing
 * otherwise.
 */
export function HostLessonPin({ lessonId }: HostLessonPinProps) {
  const { hostCurrentLessonId } = useActiveSession()
  if (hostCurrentLessonId !== lessonId) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-300/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-400">
      <Crown className="h-3 w-3" /> Värden är här
    </span>
  )
}
