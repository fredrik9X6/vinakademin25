'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { ExternalLink, Wine as WineIcon } from 'lucide-react'
import type { Wine, Media } from '../../payload-types'

interface WineReferenceBlockData {
  wine: Wine
  displayStyle: 'inline' | 'card' | 'link'
  showDetails?: {
    showImage?: boolean
    showRegion?: boolean
    showVintage?: boolean
    showGrapes?: boolean
  }
  customText?: string
  caption?: string
  openInNewTab?: boolean
}

interface WineReferenceBlockProps {
  wine: Wine
  displayStyle: WineReferenceBlockData['displayStyle']
  showDetails?: WineReferenceBlockData['showDetails']
  customText?: string
  caption?: string
  openInNewTab?: boolean
}

export function WineReferenceBlock({
  wine,
  displayStyle,
  showDetails,
  customText,
  caption,
  openInNewTab,
}: WineReferenceBlockProps) {
  const linkProps = {
    href: `/wines/${wine.slug}`,
    ...(openInNewTab && { target: '_blank', rel: 'noopener noreferrer' }),
  }

  const displayText = customText || wine.name
  const wineImage = wine.image as Media | null

  // Format price with Swedish currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (displayStyle === 'link') {
    return (
      <Link
        {...linkProps}
        className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 underline underline-offset-2 transition-colors font-medium"
      >
        {displayText}
        {openInNewTab && <ExternalLink className="h-3 w-3" />}
      </Link>
    )
  }

  if (displayStyle === 'inline') {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors">
        <Link
          {...linkProps}
          className="text-gray-900 dark:text-gray-100 hover:text-orange-500 dark:hover:text-orange-400 font-medium transition-colors"
        >
          {displayText}
        </Link>
        {wine.price && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {formatPrice(wine.price)}
          </span>
        )}
        {showDetails?.showRegion && wine.region && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {typeof wine.region === 'object' ? wine.region.name : wine.region}
          </span>
        )}
        {showDetails?.showVintage && wine.vintage && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{wine.vintage}</span>
        )}
        {openInNewTab && <ExternalLink className="h-3 w-3 text-gray-400" />}
      </span>
    )
  }

  if (displayStyle === 'card') {
    return (
      <Card className="my-6 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors bg-sidebar shadow-sm">
        <CardContent className="p-0">
          <div className="flex">
            {/* Clean image container matching card background */}
            {showDetails?.showImage && (
              <div className="relative w-28 h-36 flex-shrink-0 flex items-center justify-center">
                {wineImage ? (
                  <Image
                    src={typeof wineImage === 'object' ? wineImage.url || '' : wineImage}
                    alt={wine.name}
                    fill
                    className="object-contain p-3"
                    sizes="112px"
                    priority={false}
                  />
                ) : (
                  <WineIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                )}
              </div>
            )}

            {/* Content with minimal styling */}
            <div className="flex-1 p-4 min-h-[144px] flex flex-col justify-between">
              <div className="space-y-2">
                <Link
                  {...linkProps}
                  className="text-lg font-semibold text-sidebar-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors line-clamp-2 group"
                >
                  {wine.name}
                  {openInNewTab && (
                    <ExternalLink className="inline h-4 w-4 ml-1 align-text-top opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </Link>
                {wine.winery && (
                  <p className="text-sidebar-foreground/70 mt-0.5 line-clamp-1">{wine.winery}</p>
                )}
              </div>

              {/* Price prominently displayed */}
              {wine.price && (
                <div className="text-lg font-bold text-orange-500 dark:text-orange-400">
                  {formatPrice(wine.price)}
                </div>
              )}

              {/* Minimal details */}
              {(showDetails?.showRegion || showDetails?.showVintage || showDetails?.showGrapes) && (
                <div className="flex flex-wrap gap-2 text-sm text-sidebar-foreground/60">
                  {showDetails?.showVintage && wine.vintage && <span>{wine.vintage}</span>}
                  {showDetails?.showRegion && wine.region && (
                    <span>
                      {showDetails?.showVintage && '•'}{' '}
                      {typeof wine.region === 'object' ? wine.region.name : wine.region}
                    </span>
                  )}
                  {showDetails?.showGrapes && wine.grapes && wine.grapes.length > 0 && (
                    <span>
                      {(showDetails?.showVintage || showDetails?.showRegion) && '•'}{' '}
                      {wine.grapes
                        .slice(0, 2)
                        .map((grape) => (typeof grape === 'object' ? grape.name : grape))
                        .join(', ')}
                      {wine.grapes.length > 2 && '...'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Subtle caption */}
            {caption && (
              <p className="text-sm text-sidebar-foreground/50 italic mt-2 line-clamp-2">
                {caption}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
