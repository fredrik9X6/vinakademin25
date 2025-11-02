'use client'

import React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  disabled?: boolean
  error?: string
  'aria-label'?: string
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  showLabel = true,
  disabled = false,
  error,
  'aria-label': ariaLabel,
}: StarRatingProps) {
  const [hoveredValue, setHoveredValue] = React.useState<number | null>(null)

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  const spacingClasses = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  }

  const labelText: Record<number, string> = {
    1: 'Dålig',
    2: 'Nja',
    3: 'Genomsnitt',
    4: 'Bra',
    5: 'Utmärkt',
  }

  const displayedValue = hoveredValue ?? value

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center',
          spacingClasses[size],
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        role="radiogroup"
        aria-label={ariaLabel || 'Betyg 1-5'}
      >
        {Array.from({ length: max }, (_, i) => {
          const starValue = i + 1
          const isFilled = starValue <= displayedValue

          return (
            <button
              key={starValue}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(starValue)}
              onMouseEnter={() => !disabled && setHoveredValue(starValue)}
              onMouseLeave={() => !disabled && setHoveredValue(null)}
              className={cn(
                'transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded-sm',
                !disabled && 'cursor-pointer hover:scale-110 active:scale-95',
                disabled && 'cursor-not-allowed',
              )}
              aria-label={`Betyg ${starValue} av ${max}`}
              aria-checked={starValue === value}
              role="radio"
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-all duration-150',
                  isFilled
                    ? 'fill-orange-500 text-orange-500'
                    : 'fill-transparent text-gray-300 dark:text-gray-600',
                  hoveredValue !== null &&
                    starValue <= hoveredValue &&
                    starValue > value &&
                    'fill-orange-400 text-orange-400',
                  !disabled && starValue <= displayedValue && displayedValue > 0 && 'hover:fill-orange-400 hover:text-orange-400',
                )}
                strokeWidth={isFilled ? 0 : 1.5}
              />
            </button>
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
                  {displayedValue}
                </span>
                <span className="text-muted-foreground">/5</span>
                {labelText[displayedValue] && (
                  <span className="ml-2 text-muted-foreground">
                    • {labelText[displayedValue]}
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
          Klicka på stjärnorna för att välja betyg
        </p>
      )}
    </div>
  )
}

