import { Feather, Sparkles, Grape, Flame } from 'lucide-react'
import type { QuadrantKey } from '@/lib/vinkompassen/types'
import { cn } from '@/lib/utils'

interface Props {
  active: QuadrantKey
  /** Raw axis scores from the attempt. Negative = light / classic. */
  scoreBody: number
  scoreComfort: number
  /** All four archetype display names, keyed by quadrant. Falls back to the
   *  axis description when a name is missing. */
  names?: Partial<Record<QuadrantKey, string>>
  className?: string
}

const CELLS: Array<{
  key: QuadrantKey
  fallback: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { key: 'light-classic', fallback: 'Lätt & klassisk', icon: Feather },
  { key: 'light-adventurous', fallback: 'Lätt & äventyrlig', icon: Sparkles },
  { key: 'bold-classic', fallback: 'Fyllig & klassisk', icon: Grape },
  { key: 'bold-adventurous', fallback: 'Fyllig & äventyrlig', icon: Flame },
]

/**
 * The result page's wine-personality map.
 *
 * Replaces QuadrantMini, which rendered four unlabelled empty boxes with one
 * tinted — visually a loading skeleton, and uninterpretable without already
 * knowing the model. This version states the axes, names all four types, and
 * plots where the reader actually landed.
 *
 * The dot is the point: `scoreBody` and `scoreComfort` are already stored per
 * attempt, so we can show a position rather than just a winning box. Two people
 * in the same quadrant see visibly different results, which is what makes the
 * outcome feel measured rather than assigned.
 */
export function ArchetypeMap({ active, scoreBody, scoreComfort, names, className }: Props) {
  // Clamp before normalising: the theoretical range is ±16 (8 questions × ±2)
  // but real answer sets cluster well inside that, so scaling to the theoretical
  // maximum would bunch every dot around the centre. ±10 spreads the realistic
  // range across the box, and anything beyond simply pins near the edge.
  const clamp = (n: number) => Math.max(-10, Math.min(10, n))

  // Ties go light/classic (scoring.ts: "strict greater-than"), so a literal 0
  // must not sit on the crosshair — that reads as a rendering bug next to a
  // highlighted quadrant. Nudge it just inside the quadrant that actually won.
  const nudge = (n: number) => (n === 0 ? -0.6 : clamp(n))

  const x = 50 + (nudge(scoreComfort) / 10) * 40
  const y = 50 + (nudge(scoreBody) / 10) * 40

  const activeLabel = names?.[active] ?? CELLS.find((c) => c.key === active)?.fallback ?? ''

  return (
    <figure className={cn('w-full', className)}>
      <div className="flex items-stretch gap-2">
        {/* Vertical axis */}
        <div className="flex w-4 flex-col items-center justify-between py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span className="[writing-mode:vertical-rl] rotate-180">Lätt</span>
          <span className="[writing-mode:vertical-rl] rotate-180">Fyllig</span>
        </div>

        <div className="relative flex-1">
          <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1.5">
            {CELLS.map((cell) => {
              const isActive = cell.key === active
              const Icon = cell.icon
              return (
                <div
                  key={cell.key}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2 text-center transition-colors',
                    isActive
                      ? 'border-brand-400 bg-brand-400/10'
                      : 'border-border bg-muted/30',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 sm:h-5 sm:w-5',
                      isActive ? 'text-brand-400' : 'text-muted-foreground/50',
                    )}
                  />
                  <span
                    className={cn(
                      'text-[10px] leading-tight sm:text-[11px]',
                      isActive ? 'font-semibold text-foreground' : 'text-muted-foreground/70',
                    )}
                  >
                    {names?.[cell.key] ?? cell.fallback}
                  </span>
                </div>
              )
            })}
          </div>

          {/* "Du är här" — pointer-events-none so it never blocks the cells. */}
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className="block h-3.5 w-3.5 rounded-full border-2 border-background bg-brand-400 shadow-md ring-2 ring-brand-400/30" />
          </div>
        </div>
      </div>

      {/* Horizontal axis — offset by the vertical axis gutter so it lines up
          with the grid rather than the figure. */}
      <div className="ml-6 mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span>Klassisk</span>
        <span>Äventyrlig</span>
      </div>

      <figcaption className="sr-only">
        Vinhoroskopets fyrfält. Du är {activeLabel}.
      </figcaption>
    </figure>
  )
}
