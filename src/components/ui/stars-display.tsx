import React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarsDisplayProps {
  /** 0–max (typically 0–5). Fractional values render as a partially-clipped fill star. */
  value: number
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  /** Override class for the icon size — wins over `size`. */
  className?: string
  /** Quantize to nearest 0.5 before rendering (default true). */
  quantize?: boolean
  'aria-label'?: string
}

const SIZE_CLASSES: Record<NonNullable<StarsDisplayProps['size']>, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

const GAP_CLASSES: Record<NonNullable<StarsDisplayProps['size']>, string> = {
  xs: 'gap-0.5',
  sm: 'gap-0.5',
  md: 'gap-1',
  lg: 'gap-1',
}

/**
 * Read-only stars renderer for a numeric rating with half-star support.
 *
 * Drop-in replacement for the ad-hoc `Math.round / Math.floor / '★'.repeat()`
 * patterns scattered around the codebase. Renders each star slot as a base
 * empty icon overlaid by a clipped filled icon — `clip-path: inset(0 X% 0 0)`
 * lets us draw any fraction smoothly without compounding rounding errors.
 *
 * Spec: half-star ratings rollout 2026-06-13.
 */
export function StarsDisplay({
  value,
  max = 5,
  size = 'md',
  className,
  quantize = true,
  'aria-label': ariaLabel,
}: StarsDisplayProps) {
  const safe = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
  const v = quantize ? Math.round(safe * 2) / 2 : safe
  const iconClass = className || SIZE_CLASSES[size]

  return (
    <div
      className={cn('inline-flex items-center', GAP_CLASSES[size])}
      role="img"
      aria-label={ariaLabel || `${v.toFixed(1)} av ${max} stjärnor`}
    >
      {Array.from({ length: max }, (_, i) => {
        const fullValue = i + 1
        const halfValue = i + 0.5
        const fillPercent =
          v >= fullValue ? 100 : v >= halfValue ? 50 : 0
        return (
          <span key={i} className={cn('relative inline-block', iconClass)}>
            <Star
              className={cn('absolute inset-0', iconClass, 'fill-transparent text-gray-300 dark:text-gray-600')}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            {fillPercent > 0 && (
              <Star
                className={cn(
                  'absolute inset-0',
                  iconClass,
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
  )
}

/**
 * Helper: format a numeric rating for display next to <StarsDisplay/>.
 * "4" → "4", "4.5" → "4,5" (Swedish decimal), "4.333…" → "4,3"
 */
export function formatRatingText(value: number, locale: 'sv' | 'en' = 'sv'): string {
  if (!Number.isFinite(value)) return '—'
  const v = Math.round(value * 2) / 2
  if (Number.isInteger(v)) return String(v)
  return locale === 'sv' ? v.toFixed(1).replace('.', ',') : v.toFixed(1)
}
