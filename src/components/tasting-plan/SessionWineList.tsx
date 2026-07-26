'use client'

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export type SessionWineListStatus = 'Klar' | 'Pågår' | 'Ej börjad'

export interface SessionWineListRow {
  pourOrder: number
  /** Already blindness-safe — "Vin #N" for a guest's unrevealed wine, the real
   * title otherwise. Comes straight from the caller's redacted row data. */
  title: string
  status: SessionWineListStatus
  /** Points earned for this wine's blind guess, once revealed. Null when the
   * session isn't blind, the wine isn't revealed yet, or there's no guess. */
  points: number | null
}

interface SessionWineListProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: SessionWineListRow[]
  isBlind: boolean
  onSelect: (pourOrder: number) => void
}

const STATUS_STYLES: Record<SessionWineListStatus, string> = {
  Klar: 'text-green-600',
  Pågår: 'text-brand-400 font-medium',
  'Ej börjad': 'text-muted-foreground',
}

/**
 * Bottom-sheet overview of every wine in the session — opened from the
 * "Alla viner" control in the session header. One row per wine: pour number,
 * title, status, and (blind sessions only) points once revealed. Tapping a
 * row jumps the main view to that wine.
 *
 * Blindness binds this list: titles are passed in already redacted by the
 * caller (the same displayRow-style data the wine cards render from), so an
 * unrevealed blind wine reads as "Vin #N" here too. This component never
 * reaches back into the raw plan for names — it only renders what it's given.
 */
export function SessionWineList({
  open,
  onOpenChange,
  rows,
  isBlind,
  onSelect,
}: SessionWineListProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t pb-[env(safe-area-inset-bottom)] max-h-[88vh] overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>Alla viner</SheetTitle>
        </SheetHeader>
        {rows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Inga viner i planen.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {rows.map((row) => (
              <li key={row.pourOrder}>
                <button
                  type="button"
                  onClick={() => onSelect(row.pourOrder)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-muted-foreground">#{row.pourOrder}</span>{' '}
                    {row.title}
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-2 text-xs">
                    {isBlind && row.points !== null && (
                      <span className="font-medium tabular-nums text-brand-400">
                        +{row.points}
                      </span>
                    )}
                    <span className={STATUS_STYLES[row.status]}>{row.status}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  )
}
