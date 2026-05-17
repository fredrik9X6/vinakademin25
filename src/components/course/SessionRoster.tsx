'use client'

import Link from 'next/link'
import { useActiveSession, type RosterEntry } from '@/context/SessionContext'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionRosterProps {
  /** Optional: highlight the row matching this participant id with "(du)". */
  selfParticipantId?: number | null
  /** Optional: when provided, used to show lesson titles instead of just IDs. */
  lessonTitleById?: Map<number, string>
}

/**
 * Live roster of session participants. Reads from SessionContext.roster,
 * which is populated by RealtimeSync. The host renders in their own
 * "Värd" section above; non-host participants render below, sorted by
 * cumulative blind-tasting points (descending) — effectively a live
 * leaderboard during the tasting. Ties + non-blind sessions fall back to
 * alphabetical nickname order.
 */
export function SessionRoster({ selfParticipantId, lessonTitleById }: SessionRosterProps) {
  const { roster } = useActiveSession()

  if (roster.length === 0) {
    return (
      <div className="rounded-md border border-border bg-background p-4 text-sm text-muted-foreground">
        Inga deltagare än.
      </div>
    )
  }

  const host = roster.find((p) => p.isHost) ?? null
  const participants = roster.filter((p) => !p.isHost)

  function renderName(p: RosterEntry) {
    const inner = (
      <>
        {p.nickname}
        {selfParticipantId != null && selfParticipantId === p.id && (
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

  function renderRow(p: RosterEntry, position?: number) {
    const lessonLabel =
      p.currentLessonId == null
        ? 'Lobbyn'
        : lessonTitleById?.get(p.currentLessonId) ?? `Moment ${p.currentLessonId}`
    return (
      <li
        key={`${p.isHost ? 'host' : 'p'}-${p.id}`}
        className="flex items-center gap-3 px-4 py-2 text-sm"
      >
        {position != null && (
          <span className="w-4 text-xs text-muted-foreground tabular-nums">{position}.</span>
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

  return (
    <div className="space-y-3">
      {host && (
        <div className="rounded-md border border-border bg-background">
          <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1">
            <Crown className="h-3 w-3 text-brand-400" />
            Värd
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
            {participants.map((p, idx) => renderRow(p, idx + 1))}
          </ul>
        )}
      </div>
    </div>
  )
}
