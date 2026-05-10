'use client'

import { useActiveSession } from '@/context/SessionContext'
import { cn } from '@/lib/utils'
import { Compass, Users } from 'lucide-react'

/**
 * Pill-shaped toggle: "Följer värden" (default) ↔ "Roamar fritt".
 * Persists per-session via SessionContext.setFollowingHost (which writes to
 * localStorage). When flipped back to Following, the LessonViewer's
 * auto-advance effect snaps the participant to the host's current lesson.
 */
export function FollowHostToggle() {
  const { followingHost, setFollowingHost } = useActiveSession()

  return (
    <button
      type="button"
      onClick={() => setFollowingHost(!followingHost)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        followingHost
          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'border-border bg-background text-muted-foreground hover:bg-muted',
      )}
      aria-pressed={followingHost}
      aria-label={followingHost ? 'Sluta följa värden' : 'Följ värden'}
    >
      {followingHost ? (
        <>
          <Users className="h-3.5 w-3.5" />
          Följer värden
        </>
      ) : (
        <>
          <Compass className="h-3.5 w-3.5" />
          Roamar fritt
        </>
      )}
    </button>
  )
}
