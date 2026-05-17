'use client'

import * as React from 'react'
import Link from 'next/link'
import { useActiveSession, type RosterEntry } from '@/context/SessionContext'
import { useAuth } from '@/context/AuthContext'
import { Crown, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionRosterProps {
  /** Optional: when provided, used to show lesson titles instead of just IDs. */
  lessonTitleById?: Map<number, string>
}

/**
 * Live roster of session participants. Reads from SessionContext.roster,
 * populated by RealtimeSync.
 *
 * Layout:
 * - Host renders in their own "Värd" card above.
 * - Participants render below in a "Deltagare" card, sorted by cumulative
 *   blind-tasting points (desc → nickname asc) — i.e. a live leaderboard.
 * - For sessions with more than COLLAPSED_LIMIT participants, only the top
 *   COLLAPSED_LIMIT are shown by default. If the viewer is not in the top,
 *   their own row is also rendered (with their actual position number) so
 *   they can always see where they stand. A "Visa alla" toggle expands the
 *   full list. Scales to 100+ participants without overwhelming the sidebar.
 *
 * Self-detection: the row matching the viewer's identity is highlighted with
 * "(du)" — derived from the auth user's id for the host case, and from
 * `localStorage.participantId` (set on /api/sessions/join) for the guest case.
 */
const COLLAPSED_LIMIT = 5

export function SessionRoster({ lessonTitleById }: SessionRosterProps) {
  const { roster } = useActiveSession()
  const { user } = useAuth()
  const [selfParticipantId, setSelfParticipantId] = React.useState<number | null>(null)
  const [showAll, setShowAll] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored =
        typeof window !== 'undefined' ? window.localStorage.getItem('participantId') : null
      if (stored) setSelfParticipantId(Number(stored))
    } catch {
      // ignore — selfParticipantId stays null and "(du)" just won't render
    }
  }, [])

  if (roster.length === 0) {
    return (
      <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
        Inga deltagare än.
      </div>
    )
  }

  const host = roster.find((p) => p.isHost) ?? null
  const participants = roster.filter((p) => !p.isHost)

  function isSelf(p: RosterEntry): boolean {
    if (p.isHost) {
      // Host's roster row carries the host user's id as `id`.
      return user?.id != null && user.id === p.id
    }
    // Participants — match by session-participants row id.
    return selfParticipantId != null && selfParticipantId === p.id
  }

  function renderName(p: RosterEntry) {
    const inner = (
      <>
        {p.nickname}
        {isSelf(p) && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">(du)</span>
        )}
      </>
    )
    if (p.profileHandle) {
      return (
        <Link
          href={`/profil/${p.profileHandle}`}
          className="font-medium text-foreground hover:underline"
        >
          {inner}
        </Link>
      )
    }
    return <span className="font-medium text-foreground">{inner}</span>
  }

  function renderRow(p: RosterEntry, position?: number, extraClass?: string) {
    const lessonLabel =
      p.currentLessonId == null
        ? 'Lobbyn'
        : lessonTitleById?.get(p.currentLessonId) ?? `Moment ${p.currentLessonId}`
    return (
      <li
        key={`${p.isHost ? 'host' : 'p'}-${p.id}`}
        className={cn('flex items-center gap-3 px-4 py-2 text-sm', extraClass)}
      >
        {position != null && (
          <span className="w-5 text-xs text-muted-foreground tabular-nums">{position}.</span>
        )}
        <span
          aria-hidden
          className={cn(
            'h-2 w-2 rounded-full flex-shrink-0',
            p.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="truncate">{renderName(p)}</div>
          <div className="truncate text-xs text-muted-foreground">{lessonLabel}</div>
        </div>
        {p.points > 0 && (
          <span className="text-xs font-medium text-brand-400 flex-shrink-0 tabular-nums">
            {p.points} p
          </span>
        )}
      </li>
    )
  }

  // Build the visible-row plan. Each item carries the actual leaderboard
  // position so "you" can see their real rank even when not in the top 5.
  type VisibleRow = { p: RosterEntry; position: number; highlightAsSelf: boolean }
  const allRows: VisibleRow[] = participants.map((p, idx) => ({
    p,
    position: idx + 1,
    highlightAsSelf: false,
  }))

  let visibleRows: VisibleRow[] = allRows
  let showEllipsisBeforeSelf = false
  if (!showAll && participants.length > COLLAPSED_LIMIT) {
    visibleRows = allRows.slice(0, COLLAPSED_LIMIT)
    const selfIdx = participants.findIndex(isSelf)
    if (selfIdx >= COLLAPSED_LIMIT) {
      // Insert an ellipsis row and the viewer's actual position so they can
      // always see where they stand.
      showEllipsisBeforeSelf = true
      visibleRows.push({
        p: participants[selfIdx],
        position: selfIdx + 1,
        highlightAsSelf: true,
      })
    }
  }

  const hiddenCount = participants.length - visibleRows.length

  return (
    <div className="space-y-3">
      {host && (
        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Crown className="h-3 w-3 text-brand-400" />
            <span>Värd</span>
          </div>
          <ul>{renderRow(host)}</ul>
        </div>
      )}

      <div className="rounded-md border border-border bg-background">
        <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
          Deltagare ({participants.length})
        </div>
        {participants.length === 0 ? (
          <p className="px-4 py-2 text-sm text-muted-foreground">Inga deltagare än.</p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleRows.map((row, idx) => {
              const insertEllipsisBefore =
                showEllipsisBeforeSelf && idx === visibleRows.length - 1
              return (
                <React.Fragment key={`${row.p.id}-${row.position}`}>
                  {insertEllipsisBefore && (
                    <li className="px-4 py-1.5 text-xs text-muted-foreground text-center">
                      …
                    </li>
                  )}
                  {renderRow(
                    row.p,
                    row.position,
                    row.highlightAsSelf ? 'bg-muted/30' : undefined,
                  )}
                </React.Fragment>
              )
            })}
          </ul>
        )}
        {participants.length > COLLAPSED_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="w-full border-t border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Visa färre
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Visa alla ({hiddenCount > 0 ? `+${hiddenCount}` : participants.length})
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
