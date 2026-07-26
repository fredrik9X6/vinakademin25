'use client'

import * as React from 'react'
import { X } from 'lucide-react'

export interface SessionFocusNudgeProps {
  /** Pour the host has moved to that this viewer hasn't followed yet.
   * Null = nothing pending, render nothing. */
  pendingFollowPour: number | null
  onFollow: (pourOrder: number) => void
  onDismiss: () => void
}

/**
 * The non-hijacking "the host moved on" nudge bar. Shown to a guest instead
 * of auto-scrolling when they were mid-interaction when the host's focus
 * changed (see `shouldFollowHost` / the follow effect in
 * `PlanSessionContent`). Tapping the label follows; the × dismisses without
 * moving the screen.
 */
export function SessionFocusNudge({
  pendingFollowPour,
  onFollow,
  onDismiss,
}: SessionFocusNudgeProps) {
  if (pendingFollowPour === null) return null
  return (
    <div className="sticky bottom-20 md:bottom-4 z-40 flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 text-sm shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <button
        type="button"
        className="flex-1 text-left font-medium text-brand-400"
        onClick={() => onFollow(pendingFollowPour)}
      >
        → Värden är nu på vin #{pendingFollowPour}
      </button>
      <button
        type="button"
        aria-label="Stäng"
        className="text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
