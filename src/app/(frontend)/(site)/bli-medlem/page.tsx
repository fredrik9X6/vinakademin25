import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wine as WineIcon } from 'lucide-react'
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
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-heading">Du är redan medlem 🎉</h1>
        <p className="text-sm text-muted-foreground">
          Du har full tillgång till alla provningar i biblioteket.
        </p>
        <div className="flex gap-2">
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
        <h1 className="text-2xl font-heading">Bli medlem</h1>
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
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <header className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-400/15 text-brand-400">
          <WineIcon className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-heading">Bli medlem i Vinakademin</h1>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Få tillgång till alla provningsmallar i biblioteket, skapa egna provningar och spela
          gissningsspel under blindprovningarna.
        </p>
      </header>

      {wasCanceled && (
        <Card className="border-amber-400/40 bg-amber-100/30 dark:bg-amber-950/20">
          <CardContent className="p-3 text-sm">
            Betalningen avbröts — inga pengar drogs. Försök gärna igen.
          </CardContent>
        </Card>
      )}

      <BliMedlemForm
        monthlyPriceId={monthlyPriceId}
        yearlyPriceId={yearlyPriceId}
        monthlyAmountSek={VINAKADEMIN_PREMIUM.monthly.amountSek}
        yearlyAmountSek={VINAKADEMIN_PREMIUM.yearly.amountSek}
        trialDays={VINAKADEMIN_PREMIUM.trialDays}
        features={VINAKADEMIN_PREMIUM.features}
        unauthenticated={!user}
      />
    </div>
  )
}
