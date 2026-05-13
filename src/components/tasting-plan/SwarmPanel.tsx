'use client'

import * as React from 'react'

export interface SwarmEntry {
  avgRating: number
  ratingCount: number
  aromaCounts: Array<{ label: string; count: number }>
}

export interface SwarmPanelProps {
  entry: SwarmEntry | null | undefined
}

function renderStars(rating: number | null): string {
  if (rating == null) return '—'
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

/**
 * Tiny per-wine swarm card. Renders below a wine row's action buttons.
 *
 * - When `entry` is null/undefined OR has zero ratings, shows an empty state.
 * - Otherwise shows: avg rating chip + reviewer count + aroma frequency chips.
 *
 * The parent is responsible for gating visibility (host always; guest only
 * after they've submitted their own review for this wine).
 */
export function SwarmPanel({ entry }: SwarmPanelProps) {
  if (!entry || entry.ratingCount === 0) {
    return (
      <div className="mt-3 rounded-md border border-dashed bg-card/50 p-3">
        <p className="text-xs text-muted-foreground">Inga betyg ännu — du var först.</p>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-md border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-brand-400 text-sm tracking-wider tabular-nums">
          {renderStars(entry.avgRating)}
        </span>
        <span className="text-sm font-medium">{entry.avgRating.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">
          ({entry.ratingCount} {entry.ratingCount === 1 ? 'betyg' : 'betyg'})
        </span>
      </div>
      {entry.aromaCounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.aromaCounts.map((a) => (
            <span
              key={a.label}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <span className="capitalize">{a.label}</span>
              <span className="text-muted-foreground">({a.count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
