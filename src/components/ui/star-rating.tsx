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
   * Independent size for the click/tap zone, decoupled from the visual icon
   * size (`size`). Defaults to `size` — i.e. the historical behaviour where
   * the tappable area is exactly the icon's box. Pass `'xl'` (44px) to
   * guarantee a >=44px touch target on mobile without inflating the star
   * icon itself. Each star's two half-buttons still split that box, so the
   * full star (both halves) reaches the 44px floor even though an
   * individual half is ~half that width — see star-rating.tsx doc comment.
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
 * Click-on-star picker supporting half-step ratings.
 *
 * UX: each star is split into a left half (sets value to N-0.5) and a right
 * half (sets value to N). Hover-preview shows the half being selected so the
 * interaction is unambiguous before commit.
 *
 * The fill of fractional stars is drawn by layering a clipped orange Star on
 * top of an empty grey Star — `clip-path: inset(0 50% 0 0)` produces a clean
 * left-half fill that matches the click zone.
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
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null)

  // Icon visual size — unchanged from before hitboxSize existed.
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  // Tap-target (per-star box) size. Defaults to the icon size, preserving
  // the old 1:1 behaviour for every existing consumer that doesn't pass
  // `hitboxSize`. `xl` is only reachable via an explicit opt-in.
  const boxSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-11 w-11',
  }

  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
    xl: 'gap-2',
  }

  const boxSize = hitboxSize ?? size

  // Label only the integer anchors — half-steps share their lower whole
  // label so the cue doesn't flicker between every half-step hover.
  const labelText: Record<number, string> = {
    1: 'Dålig',
    2: 'Nja',
    3: 'Genomsnitt',
    4: 'Bra',
    5: 'Utmärkt',
  }

  const displayedValue = hoveredValue ?? value
  const formatDisplay = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center',
          spacingClasses[boxSize],
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        role="radiogroup"
        aria-label={ariaLabel || `Betyg 0.5–${max}`}
      >
        {Array.from({ length: max }, (_, i) => {
          const fullValue = i + 1
          const halfValue = i + 0.5

          // Fill state for THIS star slot, given the displayedValue.
          //   value >= fullValue  → fully filled
          //   value >= halfValue  → half filled
          //   otherwise           → empty
          const fillPercent =
            displayedValue >= fullValue ? 100 : displayedValue >= halfValue ? 50 : 0

          return (
            <span
              key={fullValue}
              className={cn(
                'relative inline-block transition-transform',
                // Deliberately NO hover:scale here. A rating control must not
                // move under the pointer: growing the star you are aiming at
                // shifts its neighbours, which makes half-step selection a
                // fight — and the effect got worse once the tap box grew to
                // 44px. The hover fill (displayedValue) already previews the
                // selection, so the transform was redundant as well as harmful.
                // On touch devices `hover:` also sticks after a tap.
                !disabled && 'active:scale-95',
                boxSizeClasses[boxSize],
              )}
            >
              {/* Empty star — always rendered as the visual base. `m-auto`
                  centers it inside the box when boxSize > size (icon and
                  tap zone decoupled); a no-op when they're equal. */}
              <Star
                className={cn(
                  'absolute inset-0 m-auto',
                  sizeClasses[size],
                  'fill-transparent text-gray-300 dark:text-gray-600',
                )}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              {/* Filled star — clipped to fillPercent of its width */}
              {fillPercent > 0 && (
                <Star
                  className={cn(
                    'absolute inset-0 m-auto',
                    sizeClasses[size],
                    'fill-orange-500 text-orange-500',
                  )}
                  style={{ clipPath: `inset(0 ${100 - fillPercent}% 0 0)` }}
                  strokeWidth={0}
                  aria-hidden="true"
                />
              )}

              {/* Click + hover zones. When step=1 we only render the
                  full-value zone covering the whole star. */}
              {step === 0.5 && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onChange(halfValue)}
                  onMouseEnter={() => !disabled && setHoveredValue(halfValue)}
                  onMouseLeave={() => !disabled && setHoveredValue(null)}
                  className={cn(
                    'absolute inset-y-0 left-0 w-1/2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-sm',
                    !disabled && 'cursor-pointer',
                    disabled && 'cursor-not-allowed',
                  )}
                  aria-label={`Betyg ${formatDisplay(halfValue)} av ${max}`}
                  aria-checked={halfValue === value}
                  role="radio"
                />
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onChange(fullValue)}
                onMouseEnter={() => !disabled && setHoveredValue(fullValue)}
                onMouseLeave={() => !disabled && setHoveredValue(null)}
                className={cn(
                  'absolute inset-y-0 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-sm',
                  step === 0.5 ? 'right-0 w-1/2' : 'inset-x-0 w-full',
                  !disabled && 'cursor-pointer',
                  disabled && 'cursor-not-allowed',
                )}
                aria-label={`Betyg ${fullValue} av ${max}`}
                aria-checked={fullValue === value}
                role="radio"
              />
            </span>
          )
        })}

        {showLabel && (
          <span
            className={cn(
              'ml-3 text-sm font-medium transition-colors',
              displayedValue === 0
                ? 'text-muted-foreground'
                : 'text-foreground',
            )}
          >
            {displayedValue > 0 && (
              <>
                <span className="font-semibold text-orange-600 dark:text-orange-400">
                  {formatDisplay(displayedValue)}
                </span>
                <span className="text-muted-foreground">/{max}</span>
                {labelText[Math.ceil(displayedValue)] && (
                  <span className="ml-2 text-muted-foreground">
                    • {labelText[Math.ceil(displayedValue)]}
                  </span>
                )}
              </>
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
          Klicka på stjärnorna för att välja betyg (även halva stjärnor)
        </p>
      )}
    </div>
  )
}
