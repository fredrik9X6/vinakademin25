import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { viewerIsMember } from '@/lib/membership'
import {
  VINAKADEMIN_PREMIUM,
  getPremiumMonthlyPriceId,
  getPremiumYearlyPriceId,
} from '@/lib/stripe-products'
import { BliMedlemForm } from './BliMedlemForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bli medlem — Vinakademin',
  description:
    'Lås upp alla provningsmallar i biblioteket samt verktyg för att hosta egna provningar.',
}

export default async function BliMedlemPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>
}) {
  const sp = await searchParams
  const wasCanceled = sp.canceled === '1'

  const user = await getUser()
  const monthlyPriceId = getPremiumMonthlyPriceId()
  const yearlyPriceId = getPremiumYearlyPriceId()

  // Already a member? Redirect to management view.
  if (viewerIsMember(user)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 space-y-6 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-brand-gradient-diagonal text-white shadow-[0_10px_24px_-8px_rgba(251,145,76,0.45)]">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-3xl sm:text-4xl">
          Du är redan medlem
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Du har full tillgång till alla provningar i biblioteket samt verktyg för att hosta egna
          provningar.
        </p>
        <div className="flex flex-wrap gap-2 justify-center pt-2">
          <Button asChild>
            <Link href="/prenumeration">Visa prenumeration</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/provningsmallar">Bläddra i biblioteket</Link>
          </Button>
        </div>
      </div>
    )
  }

  // Stripe not yet configured for this environment
  if (!monthlyPriceId || !yearlyPriceId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-3xl">Bli medlem</h1>
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Beställning är tillfälligt otillgänglig. Försök igen om en stund eller{' '}
            <Link href="/kontakt" className="text-brand-400 underline">
              hör av dig till oss
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Decorative glow behind the hero — sits below the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] sm:h-[420px]"
        style={{
          background:
            'radial-gradient(60% 80% at 50% 0%, rgba(251,145,76,0.10), transparent 70%)',
        }}
      />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16 space-y-10">
        {/* Hero */}
        <header className="text-center space-y-4">
          <p className="font-heading tracking-[-0.015em] leading-[1] text-4xl sm:text-5xl bg-clip-text text-transparent bg-brand-gradient inline-block">
            Vinakademin+
          </p>
          <h1 className="font-heading tracking-[-0.015em] leading-[1.05] text-4xl sm:text-5xl md:text-6xl">
            Hela vinvärlden{' '}
            <span className="bg-clip-text text-transparent bg-brand-gradient">på din nivå</span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Lås upp alla provningsmallar i biblioteket, skapa obegränsat med egna provningar och
            hosta större sällskap. Avbryt när som helst.
          </p>
        </header>

        {wasCanceled && (
          <Card className="border-amber-400/40 bg-amber-100/30 dark:bg-amber-950/20">
            <CardContent className="p-3 text-sm text-center">
              Betalningen avbröts — inga pengar drogs. Försök gärna igen.
            </CardContent>
          </Card>
        )}

        <BliMedlemForm
          monthlyPriceId={monthlyPriceId}
          yearlyPriceId={yearlyPriceId}
          monthlyAmountSek={VINAKADEMIN_PREMIUM.monthly.amountSek}
          yearlyAmountSek={VINAKADEMIN_PREMIUM.yearly.amountSek}
          features={VINAKADEMIN_PREMIUM.features}
          unauthenticated={!user}
        />

        <p className="text-xs text-muted-foreground text-center max-w-md mx-auto">
          Vinakademin är fortfarande gratis att använda i grunden — medlemskapet är till för dig
          som vill ha mer.
        </p>
      </div>
    </div>
  )
}
