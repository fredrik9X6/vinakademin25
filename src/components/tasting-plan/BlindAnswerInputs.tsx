'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/ui/multi-select'
import { COUNTRIES, PRICE_BUCKETS, type PriceBucket } from '@/lib/blind-guess-vocab'
import { useGrapes } from '@/lib/use-grapes'

export interface BlindAnswers {
  country: string | null
  grapes: string[]
  priceBucket: PriceBucket | null
}

export interface BlindAnswerInputsProps {
  value: BlindAnswers
  onChange: (next: BlindAnswers) => void
  disabled?: boolean
}

/**
 * Host-side answer inputs for a single wine in a blind tasting.
 *
 * - Land: single-select dropdown (one country per wine).
 * - Druvor: multi-select — supports blends, scoring accepts any match.
 * - Pris: optional override; empty = auto-derive from the wine's priceSek.
 *
 * All optional — leaving a tier blank disables that scoring tier for the wine.
 * Hidden behind a <details> toggle so the wine row stays uncluttered for
 * non-blind tastings.
 */
export function BlindAnswerInputs({ value, onChange, disabled }: BlindAnswerInputsProps) {
  const { grapes } = useGrapes()

  // Build the options list as the union of curated grapes and any currently-
  // selected grapes that aren't in the curated list (e.g. raw Systembolaget
  // strings prefilled via the wine picker). This ensures non-curated chips
  // still render with a label in the MultiSelect trigger.
  const grapeOptions = React.useMemo(() => {
    const curatedSet = new Set(grapes)
    const extraSelected = value.grapes.filter((g) => !curatedSet.has(g))
    return [
      ...grapes.map((g) => ({ label: g, value: g })),
      ...extraSelected.map((g) => ({ label: g, value: g })),
    ]
  }, [grapes, value.grapes])

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
        Blint-svar (frivilligt)
      </summary>
      <div className="mt-2 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            value={value.country ?? '__none__'}
            onValueChange={(v) =>
              onChange({ ...value, country: v === '__none__' ? null : v })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Land" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Inget svar —</SelectItem>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.priceBucket ?? '__none__'}
            onValueChange={(v) =>
              onChange({
                ...value,
                priceBucket: v === '__none__' ? null : (v as PriceBucket),
              })
            }
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pris" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Auto (från pris) —</SelectItem>
              {PRICE_BUCKETS.map((b) => (
                <SelectItem key={b.value} value={b.value}>
                  {b.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <MultiSelect
          options={grapeOptions}
          value={value.grapes}
          onValueChange={(next) => onChange({ ...value, grapes: next })}
          placeholder="Druvor (lägg till flera för blends)"
          className="w-full"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Lämna tomt för att stänga av den frågan i gissningsspelet. För blends, lägg till alla
          acceptabla druvor — gäster får poäng om de gissar någon av dem.
        </p>
      </div>
    </details>
  )
}
