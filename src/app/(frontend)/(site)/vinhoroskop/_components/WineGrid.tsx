'use client'

import posthog from 'posthog-js'
import type { Wine } from '@/payload-types'
import { VinlistanWineCard } from '@/components/vinlistan/VinlistanWineCard'

interface Props {
  wines: Wine[]
  archetypeKey: string
  /**
   * Override the responsive column classes. The locked preview on the result
   * page needs a fixed multi-column strip: at the default `grid-cols-1` a
   * phone shows exactly one blurred bottle, which does not read as "six wines
   * are waiting here".
   */
  columnsClassName?: string
}

/**
 * Vinkompass result wine recommendations. Reuses the shared VinlistanWineCard
 * so the visual treatment (images, fallbacks, hover state, link surface) is
 * identical to /vinlistan — fixes the images-not-loading bug the bespoke card
 * had and makes the click land on our wine detail page first instead of
 * straight to Systembolaget.
 */
export function WineGrid({ wines, archetypeKey, columnsClassName }: Props) {
  const handleClick = (wine: Wine) => {
    posthog?.capture?.('vinkompass_wine_clicked', {
      archetype: archetypeKey,
      wineSlug: wine.slug,
    })
  }

  return (
    <div
      className={
        columnsClassName ?? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
      }
    >
      {wines.map((wine) => (
        <VinlistanWineCard
          key={wine.id}
          wine={wine}
          onClick={() => handleClick(wine)}
        />
      ))}
    </div>
  )
}
