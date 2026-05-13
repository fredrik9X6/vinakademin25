import Link from 'next/link'
import type { CourseSession, TastingPlan, Wine, Review } from '@/payload-types'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

export interface SessionHistoryDetailProps {
  session: CourseSession
  isHost: boolean
  myReviews: Review[]
}

function sessionTitle(s: CourseSession): string {
  if (s.tastingPlan && typeof s.tastingPlan === 'object')
    return (s.tastingPlan as any).title ?? 'Provning'
  if (s.course && typeof s.course === 'object')
    return (s.course as any).title ?? 'Provning'
  return s.sessionName ?? 'Provning'
}

function wineTitle(w: any): string {
  if (w?.libraryWine && typeof w.libraryWine === 'object') {
    return (w.libraryWine as Wine).name || `Vin #${(w.libraryWine as Wine).id}`
  }
  return w?.customWine?.name || 'Vin'
}

export function SessionHistoryDetail({ session, isHost, myReviews }: SessionHistoryDetailProps) {
  const wines =
    session.tastingPlan && typeof session.tastingPlan === 'object'
      ? ((session.tastingPlan as TastingPlan).wines ?? [])
      : []
  const date = (() => {
    const iso = session.completedAt || session.expiresAt || session.createdAt
    return iso ? new Date(iso).toLocaleDateString('sv-SE') : ''
  })()
  const reviewByWineId = new Map<number, Review>()
  const reviewByCustomName = new Map<string, Review>()
  for (const r of myReviews) {
    if ((r as any).wine) {
      const id = typeof (r as any).wine === 'object' ? (r as any).wine.id : (r as any).wine
      if (typeof id === 'number') reviewByWineId.set(id, r)
    } else if ((r as any).customWine?.name) {
      reviewByCustomName.set(String((r as any).customWine.name).toLowerCase(), r)
    }
  }
  const planId =
    session.tastingPlan && typeof session.tastingPlan === 'object'
      ? (session.tastingPlan as TastingPlan).id
      : null
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link
        href="/mina-provningar/historik"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Tillbaka till historik
      </Link>
      <header>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={isHost ? 'brand' : 'secondary'}>{isHost ? 'Värd' : 'Gäst'}</Badge>
          <span className="text-sm text-muted-foreground">{date}</span>
        </div>
        <h1 className="text-2xl font-heading">{sessionTitle(session)}</h1>
      </header>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Viner</h2>
        <ul className="space-y-2">
          {wines.map((w, idx) => {
            const pourOrder = w.pourOrder ?? idx + 1
            const title = wineTitle(w)
            let myReview: Review | undefined
            if (w.libraryWine && typeof w.libraryWine === 'object') {
              myReview = reviewByWineId.get((w.libraryWine as Wine).id)
            } else if (w.customWine?.name) {
              myReview = reviewByCustomName.get(String(w.customWine.name).toLowerCase())
            }
            return (
              <li key={w.id ?? idx} className="rounded-md border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-400/10 text-brand-400 text-sm font-medium flex items-center justify-center">
                    {pourOrder}
                  </div>
                  <p className="text-sm font-medium truncate">{title}</p>
                </div>
                {myReview ? (
                  <div className="mt-2 ml-10 text-xs space-y-1">
                    {typeof (myReview as any).rating === 'number' && (
                      <p className="text-brand-400 tracking-wider">
                        {'★'.repeat(Math.round((myReview as any).rating))}
                        {'☆'.repeat(5 - Math.round((myReview as any).rating))}
                      </p>
                    )}
                    {(myReview as any).reviewText && (
                      <p className="text-muted-foreground italic">
                        &quot;{(myReview as any).reviewText}&quot;
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 ml-10 text-xs text-muted-foreground">Ingen recension</p>
                )}
              </li>
            )
          })}
        </ul>
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
