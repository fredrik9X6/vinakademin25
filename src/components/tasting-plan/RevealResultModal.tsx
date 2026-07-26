'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, X, Trophy, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import {
  scoreOne,
  resolveAnswerPriceBucket,
  maxPointsForTiers,
  pointsLabel,
  type BlindAnswer,
} from '@/lib/blind-guess-scoring'
import { priceBucketLabel, type PriceBucket } from '@/lib/blind-guess-vocab'
import type { SwarmEntry } from './SwarmPanel'

export interface RevealRosterEntry {
  id: string | number
  nickname: string
  isHost: boolean
  points: number
}

export interface RevealResultModalProps {
  open: boolean
  onClose: () => void
  pourOrder: number
  wineTitle: string
  wineSubtitle?: string | null
  wineImageUrl?: string | null
  /** The authoritative answer for this wine — only ever passed post-reveal. */
  answer: BlindAnswer
  /** This viewer's guess, if they made one. */
  myGuess: {
    country: string | null
    grape: string | null
    priceBucket: PriceBucket | null
  } | null
  /** Live roster, already carrying post-reveal cumulative points. */
  roster: RevealRosterEntry[]
  /** Cumulative points per participant id as they stood BEFORE this reveal. */
  pointsBefore: Map<string | number, number>
  /** Room's average rating for this wine, when the SSE payload has arrived. */
  swarm?: SwarmEntry | null
  /** Hosts are never scored, so their own-result block is suppressed. */
  isHost: boolean
}

/**
 * The reveal moment, as a shared beat for the whole room.
 *
 * Every participant gets this the instant the host reveals a wine: what the
 * wine actually was, how they personally did, and how the standings moved.
 *
 * Per-wine points are derived by diffing the roster's cumulative points against
 * a snapshot taken before the reveal, rather than by adding a per-wine scores
 * API. The live scorer already recomputes cumulative points from revealed pours
 * on the same SSE tick as the reveal, so the delta is exactly this wine's
 * contribution. When the snapshot is unavailable the deltas simply read 0 and
 * the standings still render — the modal degrades rather than breaking.
 */
export function RevealResultModal({
  open,
  onClose,
  pourOrder,
  wineTitle,
  wineSubtitle,
  wineImageUrl,
  answer,
  myGuess,
  roster,
  pointsBefore,
  swarm,
  isHost,
}: RevealResultModalProps) {
  const reduceMotion = useReducedMotion()

  const scored = React.useMemo(
    () =>
      myGuess
        ? scoreOne(
            {
              guessedCountry: myGuess.country,
              guessedGrape: myGuess.grape,
              guessedPriceBucket: myGuess.priceBucket,
            },
            answer,
          )
        : null,
    [myGuess, answer],
  )

  // Standings after this wine, with each player's gain and rank movement.
  const standings = React.useMemo(() => {
    const scoredRoster = roster.filter((p) => !p.isHost)
    const before = scoredRoster
      .map((p) => ({ id: p.id, points: pointsBefore.get(p.id) ?? 0 }))
      .sort((a, b) => b.points - a.points)
    const rankBefore = new Map(before.map((p, i) => [p.id, i + 1]))

    return scoredRoster
      .slice()
      .sort((a, b) => b.points - a.points || a.nickname.localeCompare(b.nickname, 'sv'))
      .map((p, i) => {
        const prior = pointsBefore.get(p.id) ?? 0
        const priorRank = rankBefore.get(p.id) ?? i + 1
        return {
          ...p,
          rank: i + 1,
          gained: Math.max(0, p.points - prior),
          rankDelta: priorRank - (i + 1),
        }
      })
  }, [roster, pointsBefore])

  const firstAnswerGrape =
    Array.isArray(answer.grapes) && answer.grapes.length > 0 ? answer.grapes[0] : null
  const maxPoints = scored
    ? maxPointsForTiers({
        country: scored.countryScored,
        grape: scored.grapeScored,
        price: scored.priceScored,
      })
    : 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="brand">Vin #{pourOrder}</Badge>
            <span className="truncate">{wineTitle}</span>
          </DialogTitle>
          {wineSubtitle && <DialogDescription>{wineSubtitle}</DialogDescription>}
        </DialogHeader>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-20 flex-shrink-0">
              {wineImageUrl ? (
                <img src={wineImageUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <WineImagePlaceholder />
              )}
            </div>
            <dl className="min-w-0 flex-1 space-y-1 text-sm">
              {answer.country && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Land:</dt>
                  <dd className="truncate font-medium">{answer.country}</dd>
                </div>
              )}
              {firstAnswerGrape && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Druva:</dt>
                  <dd className="truncate font-medium">
                    {(answer.grapes ?? []).join(', ')}
                  </dd>
                </div>
              )}
              {(answer.priceSek != null || resolveAnswerPriceBucket(answer)) && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Pris:</dt>
                  <dd className="font-medium">
                    {answer.priceSek != null
                      ? `${answer.priceSek.toLocaleString('sv-SE')} kr`
                      : priceBucketLabel(resolveAnswerPriceBucket(answer))}
                  </dd>
                </div>
              )}
              {swarm && swarm.ratingCount > 0 && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Rummets snitt:</dt>
                  <dd className="font-medium">
                    {swarm.avgRating.toFixed(1)}{' '}
                    <span className="text-muted-foreground">
                      ({swarm.ratingCount} betyg)
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Your own result — hosts are never scored. */}
          {!isHost && (
            <div className="rounded-md border bg-card p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                Din gissning
              </p>
              {scored ? (
                <div className="space-y-1.5 text-sm">
                  {scored.countryScored && (
                    <ResultRow
                      correct={scored.countryCorrect}
                      label="Land"
                      guess={myGuess?.country}
                      answer={answer.country ?? null}
                    />
                  )}
                  {scored.grapeScored && (
                    <ResultRow
                      correct={scored.grapeCorrect}
                      label="Druva"
                      guess={myGuess?.grape}
                      answer={firstAnswerGrape}
                    />
                  )}
                  {scored.priceScored && (
                    <ResultRow
                      correct={scored.priceCorrect}
                      label="Pris"
                      guess={priceBucketLabel(myGuess?.priceBucket ?? null)}
                      answer={priceBucketLabel(resolveAnswerPriceBucket(answer))}
                    />
                  )}
                  <p
                    className={`pt-1 text-sm font-semibold ${
                      scored.points > 0 ? 'text-brand-400' : 'text-muted-foreground'
                    }`}
                  >
                    +{scored.points} av {pointsLabel(maxPoints)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Du gissade inte på det här vinet.
                </p>
              )}
            </div>
          )}

          {standings.length > 0 && (
            <div className="rounded-md border bg-card p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
                <Trophy className="h-3.5 w-3.5" />
                Ställning
              </p>
              <ol className="space-y-1.5">
                {standings.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 tabular-nums text-muted-foreground">{p.rank}</span>
                    <RankMove delta={p.rankDelta} />
                    <span className="min-w-0 flex-1 truncate">{p.nickname}</span>
                    {p.gained > 0 && (
                      <span className="tabular-nums text-xs font-medium text-brand-400">
                        +{p.gained}
                      </span>
                    )}
                    <span className="w-10 text-right tabular-nums font-medium">
                      {p.points} p
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}

function ResultRow({
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
      <span className={correct ? 'mt-0.5 text-green-600' : 'mt-0.5 text-red-600'} aria-hidden>
        {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </span>
      <span>
        <span className="text-muted-foreground">{label}:</span>{' '}
        <span className={correct ? '' : 'text-muted-foreground line-through'}>
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

/** Rank movement caused by this wine. */
function RankMove({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex items-center text-green-600" aria-label={`Upp ${delta} placeringar`}>
        <ChevronUp className="h-3.5 w-3.5" />
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="flex items-center text-red-600" aria-label={`Ner ${-delta} placeringar`}>
        <ChevronDown className="h-3.5 w-3.5" />
      </span>
    )
  }
  return (
    <span className="flex items-center text-muted-foreground/40" aria-label="Oförändrad placering">
      <Minus className="h-3.5 w-3.5" />
    </span>
  )
}
