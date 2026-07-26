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
import { Badge } from '@/components/ui/badge'
import { Check, X, Pencil, Loader2, CloudOff } from 'lucide-react'
import {
  COUNTRIES,
  PRICE_BUCKETS,
  priceBucketLabel,
  type PriceBucket,
} from '@/lib/blind-guess-vocab'
import { useGrapes } from '@/lib/use-grapes'
import {
  scoreOne,
  resolveAnswerPriceBucket,
  maxPointsForTiers,
  pointsLabel,
  TIER_POINTS,
  type BlindAnswer,
} from '@/lib/blind-guess-scoring'
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
   * GRAPES enums. Price-bucket always renders all 6 buckets. */
  easyModeOptions?: {
    countries: string[] | null
    grapes: string[] | null
  } | null
  /** Which guess tiers the host enabled for this wine. Absent/null → default
   * to showing all tiers (host view, revealed wines, missing-flag fallback). */
  blindTiers?: {
    country: boolean
    grape: boolean
    price: boolean
  } | null
  /** ISO timestamp when the guess was locked in; null = draft / autosaved. */
  initialSubmittedAt?: string | null
  /** Fired once on mount when a localStorage draft was restored. */
  onRestored?: () => void
  /** Fired whenever the current in-progress guess changes (including on
   *  hydration). The parent wine card mirrors this into a ref so its single
   *  "Klar med vin #N" commit button can send the freshest guess without
   *  waiting on this component's own debounced autosave. */
  onGuessChange?: (guess: {
    guessedCountry: string | null
    guessedGrape: string | null
    guessedPriceBucket: PriceBucket | null
  }) => void
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
  blindTiers = null,
  initialSubmittedAt = null,
  onRestored,
  onGuessChange,
}: BlindGuessCardProps) {
  // Default to showing all tiers when blindTiers is absent (host path,
  // revealed wines, any unset case) — never regress existing behaviour.
  const show = blindTiers ?? { country: true, grape: true, price: true }
  const { grapes: dynamicGrapes } = useGrapes()
  // Options render alphabetically (sv collation) regardless of source — the
  // vocab enum is region-grouped and the baked decoy sets arrive shuffled.
  const countryOptions = [
    ...(easyModeOptions?.countries ?? (COUNTRIES as ReadonlyArray<string>)),
  ].sort((a, b) => a.localeCompare(b, 'sv'))
  const grapeOptions = [...(easyModeOptions?.grapes ?? dynamicGrapes)].sort((a, b) =>
    a.localeCompare(b, 'sv'),
  )
  // Grape options are decoy-limited for every blind session; the "Lättare
  // läge" badge means the host ALSO limited the country options.
  const isEasyMode = easyModeOptions?.countries != null
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

  const { status, queueSave, restoredFromDraft, restoredDraft } = useSessionDraft({
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

  // Server hydration lands AFTER mount (the parent fetches /my-submissions
  // async), so `initialGuess` is null on first render and useState never sees
  // the late value. Seed the form from it once — unless the user has already
  // edited, or a local draft (fresher than the server copy) was restored.
  // Without this, a refreshed guest sees empty selects, and their next edit
  // autosaves nulls over the previously saved fields.
  const dirtyRef = React.useRef(false)
  const serverSeedAppliedRef = React.useRef(false)
  React.useEffect(() => {
    if (serverSeedAppliedRef.current) return
    if (!initialGuess) return
    serverSeedAppliedRef.current = true
    if (dirtyRef.current || restoredDraft) return
    const next = {
      country: initialGuess.country ?? null,
      grape: initialGuess.grape ?? null,
      priceBucket: initialGuess.priceBucket ?? null,
    }
    if (next.country || next.grape || next.priceBucket) {
      setEditing(next)
    }
    if (initialSubmittedAt) {
      setLockedIn(true)
      setIsEditMode(false)
    }
  }, [initialGuess, initialSubmittedAt, restoredDraft])

  // Any field change autosaves immediately (debounced inside the hook).
  function updateField(partial: Partial<FormState>) {
    dirtyRef.current = true
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

  // Keep the parent's ref of "what this card currently holds" in sync so its
  // single commit button can send the freshest guess without depending on
  // this component's own debounced autosave having landed yet. Fires on
  // every edit AND on hydration (server-seed / draft-seed effects above both
  // update `editing`, which this depends on).
  React.useEffect(() => {
    onGuessChange?.({
      guessedCountry: editing.country,
      guessedGrape: editing.grape,
      guessedPriceBucket: editing.priceBucket,
    })
  }, [editing, onGuessChange])

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
            <PriceRow
              correct={scored.priceCorrect}
              guessLabel={priceBucketLabel(editing.priceBucket)}
              answerBucket={resolveAnswerPriceBucket(answer)}
              answerPriceSek={answer.priceSek ?? null}
            />
          )}
        </div>
        {/* Always rendered, including +0 poäng. Suppressing the zero case left a
            0/3 wine showing three red crosses and no score at all, which reads
            as "not counted" rather than "counted, and you got none". */}
        <p
          className={`pt-1 text-xs font-medium ${
            scored.points > 0 ? 'text-brand-400' : 'text-muted-foreground'
          }`}
        >
          +{scored.points} av{' '}
          {pointsLabel(
            maxPointsForTiers({
              country: scored.countryScored,
              grape: scored.grapeScored,
              price: scored.priceScored,
            }),
          )}
        </p>
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
  const shownTierCount = [show.country, show.grape, show.price].filter(Boolean).length

  // Edge case: host set up a blind wine but left all tiers empty.
  if (shownTierCount === 0) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">
          Inget att gissa på det här vinet ännu.
        </p>
      </div>
    )
  }

  const gridCols =
    shownTierCount === 1
      ? 'sm:grid-cols-1'
      : shownTierCount === 2
        ? 'sm:grid-cols-2'
        : 'sm:grid-cols-3'

  return (
    <div className="mt-3 rounded-md border bg-card p-3 space-y-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Deliberately a <p>, not an <h2>. The wine's own name is still a
              <p> in this phase, so promoting this subsection to a real heading
              would invert the hierarchy. Heading semantics land in Phase 3
              when the card is restructured. */}
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Blindgissning
          </p>
          <Badge variant="brand">{pointsLabel(maxPointsForTiers(show))}</Badge>
          {isEasyMode && (
            <span className="inline-flex items-center rounded-full bg-brand-400/10 text-brand-400 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              Lättare läge
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Låses när värden avslöjar vinet</p>
      </div>
      <div className={`grid gap-2 ${gridCols}`}>
        {show.country && (
          <div className="space-y-1">
            <TierPointChip label="Land" points={TIER_POINTS.country} />
            <Select
              value={editing.country ?? ''}
              onValueChange={(v) => updateField({ country: v || null })}
            >
              <SelectTrigger className="min-h-11">
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
          </div>
        )}
        {show.grape && (
          <div className="space-y-1">
            <TierPointChip label="Druva" points={TIER_POINTS.grape} />
            <Select
              value={editing.grape ?? ''}
              onValueChange={(v) => updateField({ grape: v || null })}
            >
              <SelectTrigger className="min-h-11">
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
          </div>
        )}
        {show.price && (
          <div className="space-y-1">
            <TierPointChip label="Pris" points={TIER_POINTS.price} />
            <Select
              value={editing.priceBucket ?? ''}
              onValueChange={(v) =>
                updateField({ priceBucket: (v || null) as PriceBucket | null })
              }
            >
              <SelectTrigger className="min-h-11">
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
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <SaveStatusLabel status={status} />
      </div>
    </div>
  )
}

/** Field label plus its point value, e.g. "Land · 1 p". */
function TierPointChip({ label, points }: { label: string; points: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[11px] font-medium tabular-nums text-brand-400">{points} p</span>
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
  if (status === 'failed') {
    return (
      <span className="text-xs text-red-600 flex items-center gap-1">
        <CloudOff className="h-3 w-3" /> Sparades inte — dina svar finns kvar
      </span>
    )
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

/**
 * Price reveal row — shows the guess bucket and the exact answer price.
 * When `answerPriceSek` is available, the exact kronor amount is displayed;
 * otherwise falls back to the bucket label alone. The bucket the real price
 * falls into is always highlighted so participants can see which range it's in.
 */
function PriceRow({
  correct,
  guessLabel,
  answerBucket,
  answerPriceSek,
}: {
  correct: boolean
  guessLabel: string | null | undefined
  answerBucket: PriceBucket | null
  answerPriceSek: number | null
}) {
  const bucketLabel = priceBucketLabel(answerBucket)
  // Exact price string, e.g. "189 kr"
  const exactPrice =
    answerPriceSek != null ? `${answerPriceSek.toLocaleString('sv-SE')} kr` : null
  // Compose what we show as the "right answer": exact price + bucket in parens, or bucket alone
  const answerDisplay = exactPrice
    ? bucketLabel
      ? `${exactPrice} (${bucketLabel})`
      : exactPrice
    : (bucketLabel ?? null)

  return (
    <div className="flex items-start gap-2">
      <span
        className={correct ? 'text-green-600 mt-0.5' : 'text-red-600 mt-0.5'}
        aria-hidden
      >
        {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
      <span>
        <span className="text-muted-foreground">Pris:</span>{' '}
        <span className={correct ? '' : 'line-through text-muted-foreground'}>
          {guessLabel || '—'}
        </span>
        {!correct && answerDisplay && (
          <span className="text-muted-foreground">
            {' '}
            (rätt: <span className="text-foreground">{answerDisplay}</span>)
          </span>
        )}
        {correct && exactPrice && (
          <span className="text-muted-foreground ml-1">
            — <span className="text-foreground">{exactPrice}</span>
          </span>
        )}
      </span>
    </div>
  )
}
