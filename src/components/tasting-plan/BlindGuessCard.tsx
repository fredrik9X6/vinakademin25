'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, X, Pencil, Loader2, CloudOff } from 'lucide-react'
import {
  COUNTRIES,
  PRICE_BUCKETS,
  priceBucketLabel,
  type PriceBucket,
} from '@/lib/blind-guess-vocab'
import { useGrapes } from '@/lib/use-grapes'
import { scoreOne, type BlindAnswer } from '@/lib/blind-guess-scoring'
import { useSessionDraft, type SaveStatus } from '@/lib/use-session-draft'

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
  /** ISO timestamp when the guess was locked in; null = draft / autosaved. */
  initialSubmittedAt?: string | null
  /** Fired once on mount when a localStorage draft was restored. */
  onRestored?: () => void
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
  initialSubmittedAt = null,
  onRestored,
}: BlindGuessCardProps) {
  const { grapes: dynamicGrapes } = useGrapes()
  const countryOptions = easyModeOptions?.countries ?? (COUNTRIES as ReadonlyArray<string>)
  const grapeOptions = easyModeOptions?.grapes ?? dynamicGrapes
  const isEasyMode = easyModeOptions != null
  // First acceptable grape for the "rätt:" hint in the post-reveal scored row.
  const firstAnswerGrape =
    Array.isArray(answer.grapes) && answer.grapes.length > 0 ? answer.grapes[0] : null

  const [editing, setEditing] = React.useState<FormState>({
    country: initialGuess?.country ?? null,
    grape: initialGuess?.grape ?? null,
    priceBucket: initialGuess?.priceBucket ?? null,
  })
  // "Locked in" once submittedAt is set (server-hydrated or via Lås in).
  const [lockedIn, setLockedIn] = React.useState<boolean>(Boolean(initialSubmittedAt))
  const [isEditMode, setIsEditMode] = React.useState<boolean>(!initialSubmittedAt)

  const { status, queueSave, lockIn, restoredFromDraft, restoredDraft } = useSessionDraft({
    kind: 'guess',
    sessionId,
    pourOrder,
    endpoint: '/api/session-guesses',
    buildBody: (draft) => ({
      sessionId,
      pourOrder,
      guessedCountry: (draft.country as string | null) ?? null,
      guessedGrape: (draft.grape as string | null) ?? null,
      guessedPriceBucket: (draft.priceBucket as PriceBucket | null) ?? null,
      ...(draft.submittedAt ? { submittedAt: draft.submittedAt } : {}),
    }),
  })

  // Seed editing state from the restored local draft (once on mount).
  // The local draft is the freshest user input — prefer it over initialGuess,
  // which may not yet reflect an autosave that hadn't landed before refresh.
  const draftSeedAppliedRef = React.useRef(false)
  React.useEffect(() => {
    if (draftSeedAppliedRef.current) return
    draftSeedAppliedRef.current = true
    if (!restoredDraft) return
    const country = (restoredDraft.country as string | null) ?? null
    const grape = (restoredDraft.grape as string | null) ?? null
    const priceBucket = (restoredDraft.priceBucket as PriceBucket | null) ?? null
    if (country || grape || priceBucket) {
      setEditing({ country, grape, priceBucket })
    }
    // If the draft carried a submittedAt the user had locked in before refresh,
    // reflect that so the locked-in summary view shows correctly.
    if (restoredDraft.submittedAt) {
      setLockedIn(true)
      setIsEditMode(false)
    }
  }, [])

  // Tell the parent (once) that we restored a local draft, for the banner.
  const restoredFiredRef = React.useRef(false)
  React.useEffect(() => {
    if (restoredFromDraft && !restoredFiredRef.current) {
      restoredFiredRef.current = true
      onRestored?.()
    }
  }, [restoredFromDraft, onRestored])

  // Any field change autosaves immediately (debounced inside the hook).
  function updateField(partial: Partial<FormState>) {
    setEditing((s) => {
      const next = { ...s, ...partial }
      queueSave({
        country: next.country,
        grape: next.grape,
        priceBucket: next.priceBucket,
      })
      return next
    })
  }

  async function handleLockIn() {
    await lockIn()
    setLockedIn(true)
    setIsEditMode(false)
  }

  const hasGuess = Boolean(editing.country || editing.grape || editing.priceBucket)

  // Reveal mode: show scored results
  if (isRevealed && hasGuess) {
    const scored = scoreOne(
      {
        guessedCountry: editing.country,
        guessedGrape: editing.grape,
        guessedPriceBucket: editing.priceBucket,
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
              guess={editing.country}
              answer={answer.country ?? null}
            />
          )}
          {scored.grapeScored && (
            <Row
              correct={scored.grapeCorrect}
              label="Druva"
              guess={editing.grape}
              answer={firstAnswerGrape}
            />
          )}
          {scored.priceScored && (
            <Row
              correct={scored.priceCorrect}
              label="Pris"
              guess={priceBucketLabel(editing.priceBucket)}
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

  // Reveal mode but no content at all: a soft note.
  if (isRevealed && !hasGuess) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">
          Du gissade inte på det här vinet.
        </p>
      </div>
    )
  }

  // Pre-reveal locked-in summary (with Ändra to re-open editing).
  if (lockedIn && !isEditMode) {
    const summary = [
      editing.country,
      editing.grape,
      priceBucketLabel(editing.priceBucket),
    ]
      .filter(Boolean)
      .join(' · ')
    return (
      <div className="mt-3 rounded-md border bg-card p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Check className="h-3 w-3 text-green-600" /> Inlåst gissning
          </p>
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
          onValueChange={(v) => updateField({ country: v || null })}
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
          onValueChange={(v) => updateField({ grape: v || null })}
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
          onValueChange={(v) => updateField({ priceBucket: (v || null) as PriceBucket | null })}
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
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          onClick={handleLockIn}
          disabled={!editing.country && !editing.grape && !editing.priceBucket}
        >
          {lockedIn ? 'Uppdatera & lås in' : 'Lås in'}
        </Button>
        <SaveStatusLabel status={status} />
      </div>
    </div>
  )
}

function SaveStatusLabel({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Sparar…
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="text-xs text-green-600 flex items-center gap-1">
        <Check className="h-3 w-3" /> Sparat
      </span>
    )
  }
  if (status === 'retrying') {
    return (
      <span className="text-xs text-amber-600 flex items-center gap-1">
        <CloudOff className="h-3 w-3" /> Återförsöker…
      </span>
    )
  }
  if (status === 'error') {
    return <span className="text-xs text-red-600">Kunde inte spara</span>
  }
  return null
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
