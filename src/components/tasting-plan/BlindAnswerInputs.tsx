'use client'

import * as React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  COUNTRIES,
  GRAPES,
  PRICE_BUCKETS,
  type PriceBucket,
} from '@/lib/blind-guess-vocab'

export interface BlindAnswers {
  country: string | null
  grape: string | null
  priceBucket: PriceBucket | null
}

export interface BlindAnswerInputsProps {
  value: BlindAnswers
  onChange: (next: BlindAnswers) => void
  disabled?: boolean
}

/**
 * Three dropdowns the host uses to set the "right answer" for a wine in a
 * blind tasting. All optional — leaving a field blank disables that scoring
 * tier for the wine.
 *
 * Wrapped in a native <details> so the inputs only appear when the host opts
 * in. Keeps the wine-row UI uncluttered for the common (non-blind) case.
 */
export function BlindAnswerInputs({ value, onChange, disabled }: BlindAnswerInputsProps) {
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground select-none">
        Blint-svar (frivilligt)
      </summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
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
          value={value.grape ?? '__none__'}
          onValueChange={(v) =>
            onChange({ ...value, grape: v === '__none__' ? null : v })
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Druva" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Inget svar —</SelectItem>
            {GRAPES.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
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
      <p className="mt-1 text-xs text-muted-foreground">
        Lämna tomt för att stänga av den frågan i gissningsspelet.
      </p>
    </details>
  )
}
