'use client'
import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface ThemeValue {
  wineType: 'any' | 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'dessert'
  priceMinSek: number | null
  priceMaxSek: number | null
  description: string
}

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeValue
  onChange: (v: ThemeValue) => void
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Vintyp</Label>
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'any', label: 'Vilken som' },
            { v: 'red', label: 'Rött' },
            { v: 'white', label: 'Vitt' },
            { v: 'rose', label: 'Rosé' },
            { v: 'sparkling', label: 'Mousserande' },
            { v: 'orange', label: 'Orange' },
            { v: 'dessert', label: 'Dessert' },
          ] as const).map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...value, wineType: v })}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                value.wineType === v
                  ? 'border-brand-400 bg-brand-400/10 text-foreground'
                  : 'border-border text-muted-foreground hover:border-brand-400/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="priceMin">Min pris (kr)</Label>
          <Input
            id="priceMin"
            type="number"
            min={0}
            value={value.priceMinSek ?? ''}
            onChange={(e) =>
              onChange({ ...value, priceMinSek: e.target.value ? Number(e.target.value) : null })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="priceMax">Max pris (kr)</Label>
          <Input
            id="priceMax"
            type="number"
            min={0}
            value={value.priceMaxSek ?? ''}
            onChange={(e) =>
              onChange({ ...value, priceMaxSek: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="t.ex. 150"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="themeDesc">
          Tema-beskrivning <span className="text-muted-foreground">(valfritt)</span>
        </Label>
        <Textarea
          id="themeDesc"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          rows={2}
          placeholder="t.ex. Endast naturviner, eller från Loire-dalen"
        />
      </div>
    </div>
  )
}
