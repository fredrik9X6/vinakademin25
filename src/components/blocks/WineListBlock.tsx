'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Wine as WineIcon, ShoppingCart, ExternalLink } from 'lucide-react'
import { Button } from '../ui/button'
import type { Wine, Media } from '../../payload-types'

interface WineListBlockProps {
  title?: string
  wines: Wine[]
  displayStyle: 'compact' | 'grid' | 'detailed'
  showPrices?: boolean
  showImages?: boolean
  showTotalPrice?: boolean
  description?: string
}

export function WineListBlock({
  title = 'Viner du behöver för denna vinprovning',
  wines,
  displayStyle,
  showPrices = true,
  showImages = true,
  showTotalPrice = true,
  description,
}: WineListBlockProps) {
  // Format price with Swedish currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Calculate total price
  const totalPrice = wines.reduce((sum, wine) => sum + (wine.price || 0), 0)

  if (displayStyle === 'compact') {
    return (
      <Card className="my-6 border-orange-200 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <WineIcon className="h-5 w-5 text-orange-500" />
                {title}
              </CardTitle>
              {description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
              )}
            </div>
            {showTotalPrice && showPrices && totalPrice > 0 && (
              <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
                Totalt: {formatPrice(totalPrice)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {wines.map((wine, index) => (
              <li
                key={wine.id}
                className="flex items-center justify-between gap-4 pb-3 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/vinlistan/${wine.slug}`}
                    className="text-base font-medium text-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors line-clamp-1 block"
                  >
                    {index + 1}. {wine.name}
                  </Link>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
                    {wine.winery && <span>{wine.winery}</span>}
                    {wine.vintage && (
                      <>
                        {wine.winery && <span>•</span>}
                        <span>{wine.vintage}</span>
                      </>
                    )}
                    {wine.region && (
                      <>
                        {(wine.winery || wine.vintage) && <span>•</span>}
                        <span>
                          {typeof wine.region === 'object' ? wine.region.name : wine.region}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {showPrices && wine.price && (
                  <span className="text-base font-semibold text-orange-600 dark:text-orange-400 flex-shrink-0">
                    {formatPrice(wine.price)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    )
  }

  if (displayStyle === 'grid') {
    return (
      <div className="my-8">
        <div className="mb-6">
          <h3 className="text-2xl font-semibold flex items-center gap-2 mb-2">
            <WineIcon className="h-6 w-6 text-orange-500" />
            {title}
          </h3>
          {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
          {showTotalPrice && showPrices && totalPrice > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-950/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Totalpris:</span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {formatPrice(totalPrice)}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wines.map((wine) => {
            const wineImage = wine.image as Media | null
            return (
              <Card
                key={wine.id}
                className="hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
              >
                <CardContent className="p-4">
                  {showImages && (
                    <div className="relative w-full h-40 mb-4 bg-muted rounded-lg flex items-center justify-center">
                      {wineImage ? (
                        <Image
                          src={typeof wineImage === 'object' ? wineImage.url || '' : wineImage}
                          alt={wine.name}
                          fill
                          className="object-contain p-2"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <WineIcon className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Link
                      href={`/vinlistan/${wine.slug}`}
                      className="font-semibold text-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors line-clamp-2 block"
                    >
                      {wine.name}
                    </Link>
                    {wine.winery && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{wine.winery}</p>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      {showPrices && wine.price && (
                        <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {formatPrice(wine.price)}
                        </span>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/vinlistan/${wine.slug}`}>
                          Visa <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Detailed List
  return (
    <div className="my-8">
      <div className="mb-6">
        <h3 className="text-2xl font-semibold flex items-center gap-2 mb-2">
          <WineIcon className="h-6 w-6 text-orange-500" />
          {title}
        </h3>
        {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
      </div>

      <div className="space-y-4">
        {wines.map((wine, index) => {
          const wineImage = wine.image as Media | null
          return (
            <Card
              key={wine.id}
              className="hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {showImages && (
                    <div className="relative w-24 h-32 flex-shrink-0 bg-muted rounded-lg flex items-center justify-center">
                      {wineImage ? (
                        <Image
                          src={typeof wineImage === 'object' ? wineImage.url || '' : wineImage}
                          alt={wine.name}
                          fill
                          className="object-contain p-2"
                          sizes="96px"
                        />
                      ) : (
                        <WineIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <Link
                            href={`/vinlistan/${wine.slug}`}
                            className="text-lg font-semibold text-foreground hover:text-orange-500 dark:hover:text-orange-400 transition-colors line-clamp-1"
                          >
                            {wine.name}
                          </Link>
                        </div>
                        {wine.winery && <p className="text-muted-foreground mb-2">{wine.winery}</p>}
                      </div>
                      {showPrices && wine.price && (
                        <span className="text-xl font-bold text-orange-600 dark:text-orange-400 flex-shrink-0">
                          {formatPrice(wine.price)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                      {wine.vintage && (
                        <span className="flex items-center gap-1">
                          <strong>Årgång:</strong> {wine.vintage}
                        </span>
                      )}
                      {wine.region && (
                        <span className="flex items-center gap-1">
                          <strong>Region:</strong>{' '}
                          {typeof wine.region === 'object' ? wine.region.name : wine.region}
                        </span>
                      )}
                      {wine.grapes && wine.grapes.length > 0 && (
                        <span className="flex items-center gap-1">
                          <strong>Druvor:</strong>{' '}
                          {wine.grapes
                            .slice(0, 3)
                            .map((grape) => (typeof grape === 'object' ? grape.name : grape))
                            .join(', ')}
                          {wine.grapes.length > 3 && '...'}
                        </span>
                      )}
                    </div>

                    <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                      <Link href={`/vinlistan/${wine.slug}`}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Visa vin
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {showTotalPrice && showPrices && totalPrice > 0 && (
        <Card className="mt-6 border-orange-200 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total kostnad för alla viner:</span>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatPrice(totalPrice)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Detta är den ungefärliga totalkostnaden för att köpa alla viner som behövs för denna
              vinprovning.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
