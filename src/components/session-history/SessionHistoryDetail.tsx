import Link from 'next/link'
import type { CourseSession, TastingPlan } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Wine as WineIcon } from 'lucide-react'
import { SessionRecapHeader } from './SessionRecapHeader'
import { WineRecapCard } from './WineRecapCard'
import { BlindLeaderboard } from './BlindLeaderboard'
import { ClearActiveSessionOnMount } from './ClearActiveSessionOnMount'
import type { RecapData } from '@/lib/session-recap'

export interface SessionHistoryDetailProps {
  session: CourseSession
  isHost: boolean
  recap: RecapData
  /** True when the viewer is an unauthenticated guest accessing the recap via
   * their participant cookie. Surfaces the "Skapa konto" CTA at the top of
   * the page. */
  viewerIsGuest?: boolean
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
  viewerIsGuest = false,
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
  const recapPath = `/mina-provningar/historik/${session.id}`
  // Match the RegistrationForm's existing claim convention: `claim=session`
  // triggers the post-signup claim hook (email-matched), `redirect` lands the
  // new user back on the recap.
  const signupHref = `/registrera?claim=session&redirect=${encodeURIComponent(recapPath)}`
  const loginHref = `/logga-in?from=${encodeURIComponent(recapPath)}`

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 pb-24">
      <ClearActiveSessionOnMount sessionId={session.id} />
      <Link
        href="/mina-provningar/historik"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till historik
      </Link>

      {viewerIsGuest && (
        <Card className="border-brand-400/40 bg-brand-400/5">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-400/15 text-brand-400 flex items-center justify-center">
                <WineIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Spara din provning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Skapa ett konto för att spara dina anteckningar, betyg och gissningar. Du
                  behåller allt från den här provningen.
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button asChild size="sm">
                <Link href={signupHref}>Skapa konto</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={loginHref}>Logga in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {recap.blindLeaderboard.length > 0 && (
        <section className="space-y-3">
          <BlindLeaderboard entries={recap.blindLeaderboard} />
        </section>
      )}

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
