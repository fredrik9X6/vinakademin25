'use client'

import React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  /**
   * Larger star size for touch surfaces. When set, the stars themselves render
   * at this size — the icon IS the target, so what you see is exactly what you
   * hit. Pass `'xl'` (44px) for the live-session form.
   */
  hitboxSize?: 'sm' | 'md' | 'lg' | 'xl'
  showLabel?: boolean
  disabled?: boolean
  error?: string
  /** Step for half-star input. Set to 1 if you want integer-only input back. */
  step?: 0.5 | 1
  'aria-label'?: string
}

/**
 * Star rating driven by pointer position across a single continuous track.
 *
 * Rewritten 2026-07-26 after live testing found the previous version unusable.
 * That version layered TEN absolutely-positioned half-buttons over the stars,
 * and — once the tap box grew to 44px while the icon stayed 32px — the visible
 * star and its click zone were misaligned by ~6px per side, with an 8px gap
 * between boxes that was also clickable. Aiming at a star's left edge could
 * land in padding or on the neighbour's half. Touch made it worse: there is no
 * hover, so the half-step preview never appeared and every tap was a guess.
 *
 * The model here is a single track:
 *  - the value is computed from pointer x across the whole row, so there are no
 *    seams, no dead zones, and no per-star hit testing to get wrong;
 *  - dragging updates live on mouse AND touch, so a mis-tap is corrected by
 *    sliding rather than by tapping again;
 *  - the icon fills its box, so the target is exactly what is drawn;
 *  - it is one tab stop with arrow-key support instead of ten tab stops.
 *
 * Fractional fill is drawn by layering a clipped orange Star over a grey one.
 */
export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  hitboxSize,
  showLabel = true,
  disabled = false,
  error,
  step = 0.5,
  'aria-label': ariaLabel,
}: StarRatingProps) {
  const [preview, setPreview] = React.useState<number | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const trackRef = React.useRef<HTMLDivElement>(null)

  const starSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-11 w-11',
  }
  const gapClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1',
    xl: 'gap-1',
  }

  const starSize = hitboxSize ?? size
  const min = step

  const labelText: Record<number, string> = {
    1: 'Dålig',
    2: 'Nja',
    3: 'Genomsnitt',
    4: 'Bra',
    5: 'Utmärkt',
  }

  const clamp = (v: number) => Math.min(max, Math.max(min, v))
  const snap = (raw: number) => (step === 0.5 ? Math.ceil(raw * 2) / 2 : Math.ceil(raw))

  /** Value under a pointer x position, in client coordinates. */
  const valueFromClientX = React.useCallback(
    (clientX: number): number => {
      const el = trackRef.current
      if (!el) return value
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) return value
      const ratio = (clientX - rect.left) / rect.width
      return clamp(snap(ratio * max))
    },
    [max, min, step, value],
  )

  const commit = (v: number) => {
    if (disabled) return
    if (v !== value) onChange(v)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    // Capture so a drag that leaves the track keeps updating — important on a
    // phone where a thumb easily strays above or below a 44px row.
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    const v = valueFromClientX(e.clientX)
    setPreview(v)
    commit(v)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    if (dragging) {
      const v = valueFromClientX(e.clientX)
      setPreview(v)
      commit(v)
      return
    }
    // Mouse hover preview. Touch never reaches here without a press, which is
    // why the value must also be legible from the fill + label after a tap.
    if (e.pointerType === 'mouse') setPreview(valueFromClientX(e.clientX))
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      setDragging(false)
    }
    setPreview(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    let next: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = clamp((value || 0) + step)
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = clamp((value || 0) - step)
    else if (e.key === 'Home') next = min
    else if (e.key === 'End') next = max
    if (next !== null) {
      e.preventDefault()
      commit(next)
    }
  }

  const displayedValue = preview ?? value
  const formatDisplay = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
  const valueText =
    displayedValue > 0
      ? `${formatDisplay(displayedValue)} av ${max}${
          labelText[Math.ceil(displayedValue)] ? ` — ${labelText[Math.ceil(displayedValue)]}` : ''
        }`
      : 'Inget betyg valt'

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <div
          ref={trackRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel || 'Betyg'}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value || undefined}
          aria-valuetext={valueText}
          aria-disabled={disabled || undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={(e) => {
            if (!dragging) setPreview(null)
            else endDrag(e)
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'inline-flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
            gapClasses[starSize],
            // touch-none: without it the browser claims the gesture for
            // scrolling and a horizontal drag across the stars never arrives.
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer touch-none',
          )}
        >
          {Array.from({ length: max }, (_, i) => {
            const fullValue = i + 1
            const fillPercent =
              displayedValue >= fullValue
                ? 100
                : displayedValue >= fullValue - 0.5
                  ? 50
                  : 0
            return (
              <span
                key={fullValue}
                className={cn('relative block shrink-0', starSizeClasses[starSize])}
              >
                <Star
                  className={cn(
                    'absolute inset-0 h-full w-full',
                    'fill-transparent text-gray-300 dark:text-gray-600',
                  )}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                {fillPercent > 0 && (
                  <Star
                    className={cn(
                      'absolute inset-0 h-full w-full',
                      'fill-orange-500 text-orange-500',
                    )}
                    style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
                    strokeWidth={0}
                    aria-hidden="true"
                  />
                )}
              </span>
            )
          })}
        </div>

        {showLabel && displayedValue > 0 && (
          <span className="ml-3 text-sm font-medium">
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              {formatDisplay(displayedValue)}
            </span>
            <span className="text-muted-foreground">/{max}</span>
            {labelText[Math.ceil(displayedValue)] && (
              <span className="ml-2 text-muted-foreground">
                • {labelText[Math.ceil(displayedValue)]}
              </span>
            )}
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive font-medium flex items-center gap-1.5" role="alert">
          <span>⚠️</span>
          {error}
        </p>
      )}
      {value === 0 && !error && (
        <p className="text-xs text-muted-foreground">
          Dra eller tryck på stjärnorna för att sätta betyg
        </p>
      )}
    </div>
  )
}
