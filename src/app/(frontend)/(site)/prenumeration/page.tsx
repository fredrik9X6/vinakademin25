import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wine as WineIcon, CheckCircle2 } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { getPayloadClient } from '@/lib/payload'
import { PortalLaunchButton } from './PortalLaunchButton'
import { OnboardingChecklist } from './OnboardingChecklist'
import { WelcomeBannerTracker } from './WelcomeBannerTracker'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Min prenumeration — Vinakademin',
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

export default async function PrenumerationPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>
}) {
  const user = await getUser()
  if (!user) {
    redirect('/logga-in?from=/prenumeration')
  }
  const sp = await searchParams
  const justSubscribed = sp.welcome === '1'

  const status = (user as { subscriptionStatus?: string | null }).subscriptionStatus ?? 'none'
  const plan = (user as { subscriptionPlan?: string | null }).subscriptionPlan ?? 'none'
  const expiry = (user as { subscriptionExpiry?: string | null }).subscriptionExpiry ?? null
  const stripeCustomerId = (user as { stripeCustomerId?: string | null }).stripeCustomerId ?? null
  const handle = (user as { handle?: string | null }).handle ?? null
  const welcomeEmailSentAt =
    (user as { welcomeEmailSentAt?: string | null }).welcomeEmailSentAt ?? null

  const isActive = status === 'active' || status === 'free_trial'
  const isCanceledButActive = status === 'canceled' && expiry && new Date(expiry).getTime() > Date.now()
  const isPastDue = status === 'past_due'

  // Resolve onboarding step state for active members. Skipped when not a
  // member so we don't pay the DB roundtrip for non-subscribers.
  let hasTastingPlan = false
  if (isActive) {
    try {
      const payload = await getPayloadClient()
      const plans = await payload.find({
        collection: 'tasting-plans',
        where: { owner: { equals: user.id } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      hasTastingPlan = plans.docs.length > 0
    } catch {
      // If lookup fails, render with hasTastingPlan=false — user can still
      // dismiss the panel.
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-heading">Min prenumeration</h1>
      </header>

      {justSubscribed && (
        <>
          <WelcomeBannerTracker plan={plan} />
          <Card className="border-emerald-400/40 bg-emerald-100/30 dark:bg-emerald-950/20">
            <CardContent className="p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Välkommen till Vinakademin Premium!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Det kan ta någon sekund innan ditt medlemskap aktiveras. Ladda om sidan om statusen
                  inte uppdateras inom någon minut.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {isActive && (
        <>
          <OnboardingChecklist
            userId={user.id as number}
            hasTastingPlan={hasTastingPlan}
            hasHandle={Boolean(handle && handle.trim())}
            welcomeEmailSentAt={welcomeEmailSentAt}
          />
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand-400/15 text-brand-400">
                  <WineIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">Du är medlem</p>
                  <p className="text-xs text-muted-foreground">
                    Plan: {plan === 'annual' ? 'Årlig' : plan === 'monthly' ? 'Månadsvis' : 'Premium'}
                    {expiry && ` · Förnyas ${formatDate(expiry)}`}
                  </p>
                </div>
              </div>
              <PortalLaunchButton />
              <p className="text-xs text-muted-foreground">
                Avbryt, uppgradera eller uppdatera betalningsuppgifter via Stripe-portalen.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {isCanceledButActive && (
        <Card className="border-amber-400/40 bg-amber-100/30 dark:bg-amber-950/20">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">Du har avslutat ditt medlemskap.</p>
            <p className="text-xs text-muted-foreground">
              Du har tillgång till alla provningar t.o.m. {formatDate(expiry)}.
            </p>
            {stripeCustomerId && <PortalLaunchButton>Återuppta prenumerationen</PortalLaunchButton>}
          </CardContent>
        </Card>
      )}

      {isPastDue && (
        <Card className="border-amber-400/40 bg-amber-100/30 dark:bg-amber-950/20">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">Senaste betalning misslyckades.</p>
            <p className="text-xs text-muted-foreground">
              Uppdatera din betalningsmetod via Stripe-portalen för att behålla medlemskapet.
            </p>
            <PortalLaunchButton>Uppdatera betalningsmetod</PortalLaunchButton>
          </CardContent>
        </Card>
      )}

      {!isActive && !isCanceledButActive && !isPastDue && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-medium">Du har inget aktivt medlemskap.</p>
            <p className="text-xs text-muted-foreground">
              Bli medlem för tillgång till alla provningar i biblioteket samt verktyg för att hosta
              egna provningar.
            </p>
            <Button asChild>
              <Link href="/bli-medlem">Bli medlem</Link>
            </Button>
            {stripeCustomerId && (
              <div>
                <PortalLaunchButton>Visa tidigare fakturor</PortalLaunchButton>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
