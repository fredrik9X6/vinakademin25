'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check } from 'lucide-react'

export interface BliMedlemFormProps {
  monthlyPriceId: string
  yearlyPriceId: string
  monthlyAmountSek: number
  yearlyAmountSek: number
  trialDays: number
  features: ReadonlyArray<string>
  /** When true, viewer is logged out — clicking the CTA bounces to /logga-in. */
  unauthenticated: boolean
}

export function BliMedlemForm({
  monthlyPriceId,
  yearlyPriceId,
  monthlyAmountSek,
  yearlyAmountSek,
  trialDays,
  features,
  unauthenticated,
}: BliMedlemFormProps) {
  const router = useRouter()
  const [plan, setPlan] = React.useState<'monthly' | 'yearly'>('yearly')
  const [busy, setBusy] = React.useState(false)

  const yearlyEquivMonthly = (yearlyAmountSek / 12).toFixed(0)
  const yearlySavings = monthlyAmountSek * 12 - yearlyAmountSek
  const savingsMonths = Math.round(yearlySavings / monthlyAmountSek)

  async function handleSubscribe() {
    if (unauthenticated) {
      router.push('/logga-in?from=/bli-medlem')
      return
    }
    setBusy(true)
    try {
      const priceId = plan === 'monthly' ? monthlyPriceId : yearlyPriceId
      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte starta betalning.')
        return
      }
      const json = await res.json()
      if (json?.url) {
        window.location.href = json.url
      } else {
        toast.error('Inget betalnings-URL från Stripe — försök igen.')
      }
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPlan('monthly')}
          className={
            plan === 'monthly'
              ? 'rounded-lg border-2 border-brand-400 bg-brand-400/5 p-4 text-left'
              : 'rounded-lg border-2 border-border bg-card p-4 text-left hover:border-muted-foreground/40 transition-colors'
          }
        >
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Månadsvis</div>
          <div className="mt-1 text-2xl font-heading">
            {monthlyAmountSek} kr
            <span className="text-sm font-normal text-muted-foreground"> /mån</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Avbryt när som helst.</div>
        </button>
        <button
          type="button"
          onClick={() => setPlan('yearly')}
          className={
            plan === 'yearly'
              ? 'relative rounded-lg border-2 border-brand-400 bg-brand-400/5 p-4 text-left'
              : 'relative rounded-lg border-2 border-border bg-card p-4 text-left hover:border-muted-foreground/40 transition-colors'
          }
        >
          {savingsMonths > 0 && (
            <span className="absolute top-2 right-2 inline-flex items-center rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Spara {savingsMonths} månader
            </span>
          )}
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Årligen</div>
          <div className="mt-1 text-2xl font-heading">
            {yearlyAmountSek} kr
            <span className="text-sm font-normal text-muted-foreground"> /år</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Motsvarar {yearlyEquivMonthly} kr/mån.
          </div>
        </button>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5 space-y-2">
          <p className="text-sm font-medium">Du får:</p>
          <ul className="space-y-1.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 mt-0.5 text-brand-400 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button onClick={handleSubscribe} disabled={busy} className="w-full" size="lg">
          {busy
            ? 'Skickar dig vidare…'
            : unauthenticated
              ? 'Logga in för att fortsätta'
              : `Starta ${trialDays} dagar gratis →`}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Avbryt när som helst. Inga bindningstider. Betalning sker via Stripe.
        </p>
      </div>
    </div>
  )
}
