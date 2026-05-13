import Link from 'next/link'
import type { CourseSession } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface SessionHistoryRow {
  session: CourseSession
  isHost: boolean
}

export interface SessionHistoryListProps {
  rows: SessionHistoryRow[]
}

function formatDate(s: CourseSession): string {
  const iso = s.completedAt || s.expiresAt || s.createdAt
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('sv-SE')
}

function sessionTitle(s: CourseSession): string {
  if (s.tastingPlan && typeof s.tastingPlan === 'object')
    return (s.tastingPlan as any).title ?? 'Provning'
  if (s.course && typeof s.course === 'object')
    return (s.course as any).title ?? 'Provning'
  return s.sessionName ?? 'Provning'
}

export function SessionHistoryList({ rows }: SessionHistoryListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
        Du har inte deltagit i några provningar än.
      </div>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map(({ session, isHost }) => (
        <li key={session.id}>
          <Link href={`/mina-provningar/historik/${session.id}`} className="block">
            <Card className="p-4 hover:shadow-md transition-shadow flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{sessionTitle(session)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(session)} · {session.participantCount ?? 0} deltagare
                </p>
              </div>
              <Badge variant={isHost ? 'brand' : 'secondary'}>{isHost ? 'Värd' : 'Gäst'}</Badge>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}
