'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BliMedlemFormProps {
  monthlyPriceId: string
  yearlyPriceId: string
  monthlyAmountSek: number
  yearlyAmountSek: number
  features: ReadonlyArray<string>
  /** When true, viewer is logged out — clicking the CTA bounces to /logga-in. */
  unauthenticated: boolean
}

export function BliMedlemForm({
  monthlyPriceId,
  yearlyPriceId,
  monthlyAmountSek,
  yearlyAmountSek,
  features,
  unauthenticated,
}: BliMedlemFormProps) {
  const router = useRouter()
  const [plan, setPlan] = React.useState<'monthly' | 'yearly'>('yearly')
  const [busy, setBusy] = React.useState(false)

  const yearlyEquivMonthly = Math.round(yearlyAmountSek / 12)
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
    <div className="space-y-8">
      {/* Plan toggle — two cards, selected one wears the brand gradient border + soft glow. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PlanCard
          selected={plan === 'monthly'}
          onSelect={() => setPlan('monthly')}
          eyebrow="Månadsvis"
          amount={monthlyAmountSek}
          period="/mån"
          subline="Avbryt när som helst."
        />
        <PlanCard
          selected={plan === 'yearly'}
          onSelect={() => setPlan('yearly')}
          eyebrow="Årligen"
          amount={yearlyAmountSek}
          period="/år"
          subline={`Motsvarar ${yearlyEquivMonthly} kr/mån.`}
          badge={savingsMonths > 0 ? `Spara ${savingsMonths} månader` : null}
        />
      </div>

      {/* Feature list — mirrors the styleguide's stat-tile pattern: brand-tinted square, brand-coloured icon, readable label. */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Det här ingår
        </p>
        <ul className="mt-4 space-y-3">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[15px] leading-relaxed">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-400/10 text-brand-400">
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={busy}
          className={cn(
            'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg px-6 text-[15px] font-medium text-white transition-transform',
            'bg-brand-gradient hover:bg-brand-gradient-reverse',
            'shadow-[0_10px_24px_-8px_rgba(251,145,76,0.45)]',
            'active:scale-[0.99]',
            busy && 'opacity-70 cursor-not-allowed',
          )}
        >
          {busy ? (
            'Skickar dig vidare…'
          ) : unauthenticated ? (
            <>
              Logga in för att fortsätta
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            <>
              Bli medlem
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          Avbryt när som helst. Inga bindningstider. Betalning sker via Stripe.
        </p>
      </div>
    </div>
  )
}

function PlanCard({
  selected,
  onSelect,
  eyebrow,
  amount,
  period,
  subline,
  badge,
}: {
  selected: boolean
  onSelect: () => void
  eyebrow: string
  amount: number
  period: string
  subline: string
  badge?: string | null
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'group relative rounded-[20px] p-0.5 text-left transition-all',
        selected
          ? 'bg-brand-gradient-tri shadow-[0_10px_30px_-12px_rgba(251,145,76,0.35)]'
          : 'bg-border hover:bg-muted-foreground/30',
      )}
    >
      <div className="relative h-full rounded-[18px] bg-card p-5 sm:p-6">
        {badge && (
          <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-brand-gradient text-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm">
            {badge}
          </span>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-heading tracking-[-0.015em] text-3xl sm:text-4xl text-foreground">
            {amount} kr
          </span>
          <span className="text-sm text-muted-foreground">{period}</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{subline}</p>
        {/* Selected-state indicator pip — tiny radio-like circle bottom-right */}
        <span
          className={cn(
            'absolute bottom-3 right-3 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
            selected
              ? 'border-brand-400 bg-brand-400 text-white'
              : 'border-muted-foreground/40 bg-transparent',
          )}
          aria-hidden
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </div>
    </button>
  )
}
