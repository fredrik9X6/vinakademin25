'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles, ArrowRight } from 'lucide-react'

interface ClaimYourTastingCardProps {
  /** Participant's nickname for personalized copy. */
  nickname?: string
  /** Email captured at join — pre-filled into the register form. */
  email?: string
  /**
   * Where to send the user after registration completes. Defaults to
   * /mina-sidor (where their newly-claimed reviews will appear).
   */
  redirectTo?: string
}

/**
 * Post-tasting CTA shown to guest participants — prompts account creation
 * so their session preferences + reviews follow them via the
 * `/api/sessions/claim` endpoint that the registration flow calls on
 * success.
 *
 * Rendered when:
 * - The viewer joined as a guest (no auth user, but has a participant cookie)
 * - The session has reached `currentActivity = 'results'` or is `completed`.
 *
 * Placement decision (Phase 4): live inside the session-results layout.
 * Available now as a standalone component for any host that wants to drop
 * it into the existing `CourseOverview` results state.
 */
export function ClaimYourTastingCard({
  nickname,
  email,
  redirectTo = '/mina-sidor',
}: ClaimYourTastingCardProps) {
  const params = new URLSearchParams()
  if (email) params.set('email', email)
  if (nickname) params.set('firstName', nickname.split(' ')[0])
  params.set('claim', 'session')
  params.set('redirect', redirectTo)
  const href = `/registrera?${params.toString()}`

  return (
    <Card className="overflow-hidden border-brand-300/40 shadow-brand-glow">
      <div className="bg-brand-gradient-diagonal px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]">
            Spara din provning
          </span>
        </div>
      </div>
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-medium text-foreground">
            {nickname ? `Bra jobbat, ${nickname.split(' ')[0]}!` : 'Bra jobbat!'}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Skapa ett konto så sparar vi alla dina recensioner och provningsanteckningar — och du
            kan komma tillbaka och se dem när som helst.
          </p>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
            Alla dina vinrecensioner samlas på Mina sidor
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
            Få förslag på liknande viner du kommer att gilla
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400" aria-hidden />
            Bjud in till dina egna grupprovningar
          </li>
        </ul>
        <Link href={href} className="btn-brand w-full justify-center">
          Skapa konto
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
        <p className="text-center text-[11px] text-muted-foreground">
          Det tar 30 sekunder. Avsluta när du vill.
        </p>
      </CardContent>
    </Card>
  )
}
