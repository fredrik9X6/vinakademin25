'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, X, Pencil } from 'lucide-react'
import {
  COUNTRIES,
  GRAPES,
  PRICE_BUCKETS,
  priceBucketLabel,
  type PriceBucket,
} from '@/lib/blind-guess-vocab'
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'

export interface BlindGuessCardProps {
  sessionId: number
  pourOrder: number
  /** True once the host has revealed this wine — switches the card to results mode. */
  isRevealed: boolean
  /** The wine's authoritative answer for scoring; nullable per tier. */
  answer: BlindAnswer
  /** Hydrated from GET /api/session-guesses on mount; null when not yet submitted. */
  initialGuess: {
    country: string | null
    grape: string | null
    priceBucket: PriceBucket | null
  } | null
  /** Server-baked easy-mode dropdown options. When provided, the country /
   * grape dropdowns render only these values instead of the full COUNTRIES /
   * GRAPES enums. Price-bucket always renders all 5 buckets. */
  easyModeOptions?: {
    countries: string[] | null
    grapes: string[] | null
  } | null
}

interface FormState {
  country: string | null
  grape: string | null
  priceBucket: PriceBucket | null
}

export function BlindGuessCard({
  sessionId,
  pourOrder,
  isRevealed,
  answer,
  initialGuess,
  easyModeOptions = null,
}: BlindGuessCardProps) {
  const countryOptions = easyModeOptions?.countries ?? (COUNTRIES as ReadonlyArray<string>)
  const grapeOptions = easyModeOptions?.grapes ?? (GRAPES as ReadonlyArray<string>)
  const isEasyMode = easyModeOptions != null
  // First acceptable grape for the "rätt:" hint in the post-reveal scored row.
  const firstAnswerGrape =
    Array.isArray(answer.grapes) && answer.grapes.length > 0 ? answer.grapes[0] : null
  const [submitted, setSubmitted] = React.useState<FormState | null>(
    initialGuess
      ? {
          country: initialGuess.country,
          grape: initialGuess.grape,
          priceBucket: initialGuess.priceBucket,
        }
      : null,
  )
  const [editing, setEditing] = React.useState<FormState>({
    country: initialGuess?.country ?? null,
    grape: initialGuess?.grape ?? null,
    priceBucket: initialGuess?.priceBucket ?? null,
  })
  const [isEditMode, setIsEditMode] = React.useState<boolean>(!initialGuess)
  const [busy, setBusy] = React.useState(false)

  async function handleSubmit() {
    if (!editing.country && !editing.grape && !editing.priceBucket) {
      toast.error('Välj minst ett svar.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/session-guesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          pourOrder,
          guessedCountry: editing.country,
          guessedGrape: editing.grape,
          guessedPriceBucket: editing.priceBucket,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error || 'Kunde inte spara gissningen.')
        return
      }
      setSubmitted({ ...editing })
      setIsEditMode(false)
      toast.success('Gissning sparad.')
    } catch {
      toast.error('Nätverksfel — försök igen.')
    } finally {
      setBusy(false)
    }
  }

  // Reveal mode: show scored results
  if (isRevealed && submitted) {
    const scored = scoreOne(
      {
        guessedCountry: submitted.country,
        guessedGrape: submitted.grape,
        guessedPriceBucket: submitted.priceBucket,
      },
      answer,
    )
    return (
      <div className="mt-3 rounded-md border bg-card p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Din gissning
        </p>
        <div className="flex flex-col gap-1.5 text-sm">
          {scored.countryScored && (
            <Row
              correct={scored.countryCorrect}
              label="Land"
              guess={submitted.country}
              answer={answer.country ?? null}
            />
          )}
          {scored.grapeScored && (
            <Row
              correct={scored.grapeCorrect}
              label="Druva"
              guess={submitted.grape}
              answer={firstAnswerGrape}
            />
          )}
          {scored.priceScored && (
            <Row
              correct={scored.priceCorrect}
              label="Pris"
              guess={priceBucketLabel(submitted.priceBucket)}
              answer={priceBucketLabel(
                answer.priceBucket ?? null,
              )}
            />
          )}
        </div>
        {scored.points > 0 && (
          <p className="pt-1 text-xs text-brand-400 font-medium">
            +{scored.points} {scored.points === 1 ? 'poäng' : 'poäng'}
          </p>
        )}
      </div>
    )
  }

  // Reveal mode but no submission: a soft note
  if (isRevealed && !submitted) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">
          Du gissade inte på det här vinet.
        </p>
      </div>
    )
  }

  // Pre-reveal: read-only summary if submitted (with Ändra)
  if (submitted && !isEditMode) {
    const summary = [
      submitted.country,
      submitted.grape,
      priceBucketLabel(submitted.priceBucket),
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <div className="mt-3 rounded-md border bg-card p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Din gissning</p>
          <p className="text-sm truncate">{summary || '—'}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsEditMode(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Ändra
        </Button>
      </div>
    )
  }

  // Edit mode (initial or after "Ändra")
  return (
    <div className="mt-3 rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Gissa innan värden avslöjar
        </p>
        {isEasyMode && (
          <span className="inline-flex items-center rounded-full bg-brand-400/10 text-brand-400 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
            Lättare läge
          </span>
        )}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Select
          value={editing.country ?? ''}
          onValueChange={(v) => setEditing((s) => ({ ...s, country: v || null }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Land" />
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={editing.grape ?? ''}
          onValueChange={(v) => setEditing((s) => ({ ...s, grape: v || null }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Druva" />
          </SelectTrigger>
          <SelectContent>
            {grapeOptions.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={editing.priceBucket ?? ''}
          onValueChange={(v) =>
            setEditing((s) => ({ ...s, priceBucket: (v || null) as PriceBucket | null }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Pris" />
          </SelectTrigger>
          <SelectContent>
            {PRICE_BUCKETS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Sparar…' : submitted ? 'Spara ändring' : 'Skicka gissning'}
        </Button>
        {submitted && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing({
                country: submitted.country,
                grape: submitted.grape,
                priceBucket: submitted.priceBucket,
              })
              setIsEditMode(false)
            }}
          >
            Avbryt
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({
  correct,
  label,
  guess,
  answer,
}: {
  correct: boolean
  label: string
  guess: string | null | undefined
  answer: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={correct ? 'text-green-600 mt-0.5' : 'text-red-600 mt-0.5'}
        aria-hidden
      >
        {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
      <span>
        <span className="text-muted-foreground">{label}:</span>{' '}
        <span className={correct ? '' : 'line-through text-muted-foreground'}>
          {guess || '—'}
        </span>
        {!correct && answer && (
          <span className="text-muted-foreground">
            {' '}
            (rätt: <span className="text-foreground">{answer}</span>)
          </span>
        )}
      </span>
    </div>
  )
}
