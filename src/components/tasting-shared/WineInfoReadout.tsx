'use client'

import * as React from 'react'

export interface WineInfoReadoutProps {
  /** Värdens manus — pass only for the host view. */
  hostNotes?: string | null
  abv?: number | null
  servingTemp?: string | null
  guestDescription?: string | null
  foodPairing?: string | null
}

/**
 * Read-only render of a wine's richer info. Renders only the sections that
 * have content. Used by the session host sheet (pass hostNotes + facts) and
 * the guest reveal block (pass guest fields + facts, omit hostNotes).
 */
export function WineInfoReadout({
  hostNotes,
  abv,
  servingTemp,
  guestDescription,
  foodPairing,
}: WineInfoReadoutProps) {
  const hasFacts = abv != null || (servingTemp != null && servingTemp.trim().length > 0)
  const hasGuest =
    (guestDescription != null && guestDescription.trim().length > 0) ||
    (foodPairing != null && foodPairing.trim().length > 0)
  const hasManus = hostNotes != null && hostNotes.trim().length > 0

  if (!hasFacts && !hasGuest && !hasManus) return null

  return (
    <div className="space-y-3 text-sm">
      {hasManus && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground">Värdens manus</h4>
          <p className="whitespace-pre-wrap">{hostNotes}</p>
        </div>
      )}
      {hasFacts && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {abv != null && (
            <span>
              <span className="text-muted-foreground">Alkohol: </span>
              {abv} %
            </span>
          )}
          {servingTemp != null && servingTemp.trim().length > 0 && (
            <span>
              <span className="text-muted-foreground">Servering: </span>
              {servingTemp}
            </span>
          )}
        </div>
      )}
      {hasGuest && (
        <div className="space-y-1">
          {guestDescription != null && guestDescription.trim().length > 0 && (
            <p className="whitespace-pre-wrap">{guestDescription}</p>
          )}
          {foodPairing != null && foodPairing.trim().length > 0 && (
            <p>
              <span className="text-muted-foreground">Passar till: </span>
              {foodPairing}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
