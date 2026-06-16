'use client'

import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { WineExtraFields } from './wine-extra-fields'

export type WineDetailValues = WineExtraFields & { hostNotes: string }

export interface WineDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Wine name for the sheet header. */
  title: string
  subtitle?: string
  values: WineDetailValues
  onChange: (patch: Partial<WineDetailValues>) => void
  /** Plan-only blind-answer inputs, rendered as a final "Blint facit" section. */
  blindSlot?: React.ReactNode
  disabled?: boolean
}

/**
 * Full-screen on mobile / side sheet on desktop editor for a single wine's
 * richer info. Keeps the wine list compact: all the longer fields live here.
 */
export function WineDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  values,
  onChange,
  blindSlot,
  disabled,
}: WineDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto p-0"
      >
        <SheetHeader className="px-4 py-4 pr-10 border-b">
          <SheetTitle className="truncate">{title || 'Vin'}</SheetTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </SheetHeader>

        <div className="px-4 py-4 space-y-6">
          {/* Fakta */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Fakta</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wd-abv">Alkohol (%)</Label>
                <Input
                  id="wd-abv"
                  type="number"
                  min={0}
                  max={25}
                  step={0.1}
                  value={values.abv ?? ''}
                  onChange={(e) =>
                    onChange({ abv: e.target.value === '' ? null : Number(e.target.value) })
                  }
                  disabled={disabled}
                />
              </div>
              <div>
                <Label htmlFor="wd-temp">Serveringstemp.</Label>
                <Input
                  id="wd-temp"
                  value={values.servingTemp}
                  onChange={(e) => onChange({ servingTemp: e.target.value })}
                  placeholder="t.ex. 8–10 °C"
                  disabled={disabled}
                />
              </div>
            </div>
          </section>

          {/* Värdens manus (host-only) */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Värdens manus</h3>
            <p className="text-xs text-muted-foreground">Visas bara för värden under provningen.</p>
            <Textarea
              className="min-h-[100px] text-sm"
              placeholder="Berättelse, talepunkter, vad gästerna ska leta efter…"
              value={values.hostNotes}
              onChange={(e) => onChange({ hostNotes: e.target.value })}
              disabled={disabled}
            />
          </section>

          {/* För gästerna */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">För gästerna</h3>
            <p className="text-xs text-muted-foreground">
              Visas för gästerna (vid avslöjande i blindprovning).
            </p>
            <div>
              <Label htmlFor="wd-guest-desc">Beskrivning</Label>
              <Textarea
                id="wd-guest-desc"
                className="min-h-[80px] text-sm"
                placeholder="Beskriv vinet för gästerna."
                value={values.guestDescription}
                onChange={(e) => onChange({ guestDescription: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="wd-pairing">Passar till</Label>
              <Input
                id="wd-pairing"
                value={values.foodPairing}
                onChange={(e) => onChange({ foodPairing: e.target.value })}
                placeholder="t.ex. grillat lamm, hårdost"
                disabled={disabled}
              />
            </div>
          </section>

          {blindSlot && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Blint facit</h3>
              {blindSlot}
            </section>
          )}
        </div>

        <div className="sticky bottom-0 border-t bg-background px-4 py-3 flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Klar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
