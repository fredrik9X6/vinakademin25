'use client'

import Image from 'next/image'
import posthog from 'posthog-js'
import type { Wine, Media } from '@/payload-types'

interface Props {
  wines: Wine[]
  archetypeKey: string
}

export function WineGrid({ wines, archetypeKey }: Props) {
  const handleClick = (wine: Wine) => {
    posthog?.capture?.('vinkompass_wine_clicked', {
      archetype: archetypeKey,
      wineSlug: wine.slug,
    })
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {wines.map((wine) => {
        const media = (wine.image && typeof wine.image === 'object' ? (wine.image as Media) : null)
        const imageUrl = media?.url || ''
        const url = wine.systembolagetUrl || '#'
        return (
          <a
            key={wine.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(wine)}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-[#FB914C]"
          >
            <div className="relative h-44 w-full overflow-hidden rounded-xl bg-muted">
              {imageUrl ? (
                <Image src={imageUrl} alt={wine.name} fill className="object-contain" sizes="(max-width:768px) 100vw, 33vw" />
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {wine.winery}
              </span>
              <h3 className="font-heading text-lg leading-tight tracking-[-0.015em]">{wine.name}</h3>
              {typeof wine.price === 'number' ? (
                <span className="text-sm text-muted-foreground">{wine.price} kr</span>
              ) : null}
              <span className="mt-2 text-sm font-medium text-[#FB914C] group-hover:underline">
                Köp på Systembolaget →
              </span>
            </div>
          </a>
        )
      })}
    </div>
  )
}
