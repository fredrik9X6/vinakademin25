'use client'

import { useActiveSession } from '@/context/SessionContext'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionRosterProps {
  /** Optional: highlight the row matching this participant id with "(du)". */
  selfParticipantId?: number | null
  /** Optional: when provided, used to show lesson titles instead of just IDs. */
  lessonTitleById?: Map<number, string>
}

/**
 * Live roster of session participants. Reads from SessionContext.roster, which
 * is populated by RealtimeSync. Host is always first; participants follow,
 * sorted by nickname.
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

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="border-b border-border px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        Deltagare ({roster.length})
      </div>
      <ul className="divide-y divide-border">
        {roster.map((p) => {
          const isSelf = selfParticipantId != null && selfParticipantId === p.id
          const lessonLabel =
            p.currentLessonId == null
              ? 'Lobbyn'
              : lessonTitleById?.get(p.currentLessonId) ?? `Lektion ${p.currentLessonId}`
          return (
            <li
              key={`${p.isHost ? 'host' : 'p'}-${p.id}`}
              className="flex items-center gap-3 px-4 py-2 text-sm"
            >
              <span
                aria-hidden
                className={cn(
                  'h-2 w-2 rounded-full',
                  p.online ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                )}
              />
              <div className="flex-1 truncate">
                <span className="font-medium text-foreground">
                  {p.nickname}
                  {isSelf ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(du)</span>
                  ) : null}
                </span>
                {p.isHost ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs text-brand-400">
                    <Crown className="h-3 w-3" /> Värden
                  </span>
                ) : null}
                <div className="truncate text-xs text-muted-foreground">{lessonLabel}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
