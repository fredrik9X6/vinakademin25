'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleChip } from '@/lib/chip-selection'

export interface ChipOption {
  label: string
  value: string
}

export interface ChipMultiSelectProps {
  /** Ordered options. `buildFlavourOptions` already puts suggestions first. */
  options: ChipOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  /** Accessible name for the group, e.g. "Smaker du känner igen". */
  ariaLabel: string
  /** How many chips to show before the "Visa alla" disclosure. */
  visibleCount?: number
  className?: string
}

const DEFAULT_VISIBLE = 12

/**
 * Tap-to-toggle multi-select.
 *
 * Replaces the cmdk Popover + typed-search MultiSelect on the tasting-note
 * form — the most rage-clicked control in the product, on mobile, at a dinner
 * table. Chips need one tap, no keyboard, and no overlay.
 *
 * The vocabularies are large (45 / 21 / 15), so only the first `visibleCount`
 * options render initially and the rest sit behind a disclosure. Callers pass
 * options from `buildFlavourOptions`, which orders the wine-type suggestions
 * first — so the visible chips are the plausible ones without this component
 * needing to know anything about wine.
 *
 * Any already-selected option is always rendered, even when it falls in the
 * hidden remainder: a selection the user cannot see is worse than a long list.
 *
 * Every chip is min-h-11 (44px) to meet the touch-target floor.
 */
export function ChipMultiSelect({
  options,
  value,
  onValueChange,
  ariaLabel,
  visibleCount = DEFAULT_VISIBLE,
  className,
}: ChipMultiSelectProps) {
  const [showAll, setShowAll] = React.useState(false)

  const shown = React.useMemo(() => {
    if (showAll || options.length <= visibleCount) return options
    const head = options.slice(0, visibleCount)
    const headValues = new Set(head.map((o) => o.value))
    // Keep selected-but-hidden options visible so a selection is never invisible.
    const selectedTail = options.filter(
      (o) => !headValues.has(o.value) && value.includes(o.value),
    )
    return [...head, ...selectedTail]
  }, [options, showAll, visibleCount, value])

  const hiddenCount = options.length - shown.length

  return (
    <div className={cn('space-y-2', className)}>
      <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
        {shown.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => onValueChange(toggleChip(value, opt.value))}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-brand-400 bg-brand-400/10 text-brand-400 font-medium'
                  : 'border-input bg-background text-foreground hover:bg-accent',
              )}
            >
              {selected && <Check className="h-3.5 w-3.5" aria-hidden />}
              {opt.label}
            </button>
          )
        })}
      </div>
      {(hiddenCount > 0 || showAll) && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="min-h-11 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {showAll ? 'Visa färre' : `Visa alla (${options.length})`}
        </button>
      )}
    </div>
  )
}
