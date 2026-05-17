import Link from 'next/link'
import type { CourseSession, TastingPlan } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { SessionRecapHeader } from './SessionRecapHeader'
import { WineRecapCard } from './WineRecapCard'
import type { RecapData } from '@/lib/session-recap'

export interface SessionHistoryDetailProps {
  session: CourseSession
  isHost: boolean
  recap: RecapData
}

function sessionTitle(s: CourseSession): string {
  if (s.tastingPlan && typeof s.tastingPlan === 'object')
    return (s.tastingPlan as TastingPlan).title ?? 'Provning'
  if (s.course && typeof s.course === 'object')
    return ((s.course as { title?: string }).title) ?? 'Provning'
  return s.sessionName ?? 'Provning'
}

export function SessionHistoryDetail({
  session,
  isHost,
  recap,
}: SessionHistoryDetailProps) {
  const planId =
    session.tastingPlan && typeof session.tastingPlan === 'object'
      ? (session.tastingPlan as TastingPlan).id
      : null
  const date = (() => {
    const iso = session.completedAt || session.expiresAt || session.createdAt
    return iso ? new Date(iso).toLocaleDateString('sv-SE') : ''
  })()
  const { headline, perWine } = recap

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 pb-24">
      <Link
        href="/mina-provningar/historik"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till historik
      </Link>

      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={isHost ? 'brand' : 'secondary'}>
            {isHost ? 'Värd' : 'Gäst'}
          </Badge>
          {date && (
            <span className="text-sm text-muted-foreground">{date}</span>
          )}
        </div>
        <h1 className="text-2xl font-heading">{sessionTitle(session)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {headline.totalReviewers}{' '}
          {headline.totalReviewers === 1 ? 'deltagare' : 'deltagare'} ·{' '}
          {headline.totalReviews}{' '}
          {headline.totalReviews === 1 ? 'recension' : 'recensioner'}
        </p>
      </header>

      <SessionRecapHeader headline={headline} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vin för vin</h2>
        {perWine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga viner i sessionen.</p>
        ) : (
          <ul className="space-y-3">
            {perWine.map((wine) => (
              <li key={wine.pourOrder}>
                <WineRecapCard wine={wine} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isHost && planId && (
        <p className="text-sm">
          <Link
            href={`/mina-provningar/planer/${planId}`}
            className="text-brand-400 hover:underline"
          >
            Visa planen →
          </Link>
        </p>
      )}
    </div>
  )
}
