'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Wine as WineIcon, ShoppingCart, ExternalLink, Sparkles } from 'lucide-react'
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
  shoppingListUrl?: string
}

export function WineListBlock({
  title = 'Viner du behöver för denna vinprovning',
  wines,
  displayStyle,
  showPrices = true,
  showImages = true,
  showTotalPrice = true,
  description,
  shoppingListUrl,
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

  // Helper function to get wine link
  const getWineLink = (wine: Wine) => {
    const externalUrl = wine.systembolagetUrl
    const internalUrl = `/vinlistan/${wine.slug}`
    return externalUrl || internalUrl
  }

  // Helper function to check if wine link is external
  const isExternalLink = (wine: Wine) => !!wine.systembolagetUrl

  if (displayStyle === 'compact') {
    return (
      <Card className="my-6 border border-orange-200/60 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/30 via-white to-orange-50/10 dark:from-orange-950/10 dark:via-background dark:to-orange-950/5 shadow-md hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-1.5">
                <WineIcon className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                <span className="line-clamp-2">{title}</span>
              </CardTitle>
              {description && (
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            {showTotalPrice && showPrices && totalPrice > 0 && (
              <Badge
                variant="secondary"
                className="text-sm font-semibold px-2.5 py-1 bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 flex-shrink-0"
              >
                {formatPrice(totalPrice)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            {wines.map((wine, index) => {
              const wineHref = getWineLink(wine)
              const isExternal = isExternalLink(wine)
              const LinkComponent = isExternal ? 'a' : Link
              const linkProps = isExternal
                ? {
                    href: wineHref,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }
                : {
                    href: wineHref,
                  }

              return (
                <LinkComponent
                  key={wine.id}
                  {...linkProps}
                  className="group flex items-center justify-between gap-3 p-2.5 rounded-md border border-border/30 bg-background/50 hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-transparent dark:hover:from-orange-950/20 dark:hover:to-transparent hover:border-orange-300/50 dark:hover:border-orange-700/50 transition-all duration-150"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20 flex items-center justify-center font-semibold text-orange-600 dark:text-orange-400 text-xs">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-1">
                        {wine.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                        {wine.winery && (
                          <span className="font-medium">{wine.winery}</span>
                        )}
                        {wine.vintage && (
                          <>
                            {wine.winery && <span className="text-muted-foreground/40">•</span>}
                            <span>{wine.vintage}</span>
                          </>
                        )}
                        {wine.region && (
                          <>
                            {(wine.winery || wine.vintage) && (
                              <span className="text-muted-foreground/40">•</span>
                            )}
                            <span className="line-clamp-1">
                              {typeof wine.region === 'object' ? wine.region.name : wine.region}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {showPrices && wine.price && (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                        {formatPrice(wine.price)}
                      </span>
                      {isExternal && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  )}
                </LinkComponent>
              )
            })}
          </div>
          {shoppingListUrl && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <Button
                asChild
                className="w-full sm:w-auto"
              >
                <a href={shoppingListUrl} target="_blank" rel="noopener noreferrer">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Till Systembolaget
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (displayStyle === 'grid') {
    return (
      <div className="my-10">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20">
                  <WineIcon className="h-6 w-6 md:h-7 md:w-7 text-orange-600 dark:text-orange-400" />
                </div>
                {title}
              </h3>
              {description && (
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                  {description}
                </p>
              )}
            </div>
          </div>
          {showTotalPrice && showPrices && totalPrice > 0 && (
            <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 shadow-sm">
              <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Totalpris</span>
                <span className="text-xl md:text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Wine Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wines.map((wine) => {
            const wineImage = wine.image as Media | null
            const wineHref = getWineLink(wine)
            const isExternal = isExternalLink(wine)
            const LinkComponent = isExternal ? 'a' : Link
            const linkProps = isExternal
              ? {
                  href: wineHref,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                }
              : {
                  href: wineHref,
                }

            return (
              <Card
                key={wine.id}
                className="group relative overflow-hidden border-2 border-border/50 bg-background hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <CardContent className="p-0">
                  {showImages && (
                    <div className="relative w-full h-56 bg-gradient-to-br from-muted/50 to-muted/30 overflow-hidden">
                      {wineImage ? (
                        <Image
                          src={typeof wineImage === 'object' ? wineImage.url || '' : wineImage}
                          alt={wine.name}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="p-6 rounded-full bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20">
                            <WineIcon className="w-16 h-16 text-muted-foreground/40" />
                          </div>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <div>
                      <LinkComponent
                        {...linkProps}
                        className="font-bold text-lg text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2 block mb-2"
                      >
                        {wine.name}
                        {isExternal && (
                          <ExternalLink className="inline h-3.5 w-3.5 ml-1 align-text-top opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </LinkComponent>
                      {wine.winery && (
                        <p className="text-sm font-medium text-muted-foreground line-clamp-1">
                          {wine.winery}
                          {wine.vintage && ` • ${wine.vintage}`}
                        </p>
                      )}
                      {wine.region && (
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          {typeof wine.region === 'object' ? wine.region.name : wine.region}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      {showPrices && wine.price && (
                        <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                          {formatPrice(wine.price)}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700"
                      >
                        {isExternal ? (
                          <a href={wineHref} target="_blank" rel="noopener noreferrer">
                            Visa <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <Link href={wineHref}>
                            Visa <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {shoppingListUrl && (
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
            >
              <a href={shoppingListUrl} target="_blank" rel="noopener noreferrer">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Till Systembolaget
                <ExternalLink className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Detailed List
  return (
    <div className="my-10">
      {/* Header Section */}
      <div className="mb-8">
        <h3 className="text-2xl md:text-3xl font-bold flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20">
            <WineIcon className="h-6 w-6 md:h-7 md:w-7 text-orange-600 dark:text-orange-400" />
          </div>
          {title}
        </h3>
        {description && (
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl mb-6">
            {description}
          </p>
        )}
      </div>

      {/* Wine List */}
      <div className="space-y-4">
        {wines.map((wine, index) => {
          const wineImage = wine.image as Media | null
          const wineHref = getWineLink(wine)
          const isExternal = isExternalLink(wine)
          const LinkComponent = isExternal ? 'a' : Link
          const linkProps = isExternal
            ? {
                href: wineHref,
                target: '_blank',
                rel: 'noopener noreferrer',
              }
            : {
                href: wineHref,
              }

          return (
            <Card
              key={wine.id}
              className="group overflow-hidden border-2 border-border/50 bg-background hover:border-orange-300 dark:hover:border-orange-700 transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-0">
                <div className="flex flex-col sm:flex-row gap-0">
                  {showImages && (
                    <div className="relative w-full sm:w-32 lg:w-40 h-48 sm:h-auto bg-gradient-to-br from-muted/50 to-muted/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {wineImage ? (
                        <Image
                          src={typeof wineImage === 'object' ? wineImage.url || '' : wineImage}
                          alt={wine.name}
                          fill
                          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, 160px"
                        />
                      ) : (
                        <div className="p-4">
                          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-400/20 dark:to-orange-500/20">
                            <WineIcon className="w-12 h-12 text-muted-foreground/40" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge
                              variant="outline"
                              className="text-xs font-bold px-2.5 py-0.5 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
                            >
                              #{index + 1}
                            </Badge>
                            <LinkComponent
                              {...linkProps}
                              className="text-xl md:text-2xl font-bold text-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors line-clamp-2"
                            >
                              {wine.name}
                              {isExternal && (
                                <ExternalLink className="inline h-4 w-4 ml-1 align-text-top opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </LinkComponent>
                          </div>
                          {wine.winery && (
                            <p className="text-base font-semibold text-muted-foreground mb-3">
                              {wine.winery}
                            </p>
                          )}
                        </div>
                        {showPrices && wine.price && (
                          <div className="flex-shrink-0 text-right">
                            <span className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">
                              {formatPrice(wine.price)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
                        {wine.vintage && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground/70">Årgång:</span>
                            <span>{wine.vintage}</span>
                          </div>
                        )}
                        {wine.region && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground/70">Region:</span>
                            <span>{typeof wine.region === 'object' ? wine.region.name : wine.region}</span>
                          </div>
                        )}
                        {wine.grapes && wine.grapes.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground/70">Druvor:</span>
                            <span>
                              {wine.grapes
                                .slice(0, 3)
                                .map((grape) => (typeof grape === 'object' ? grape.name : grape))
                                .join(', ')}
                              {wine.grapes.length > 3 && '...'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="w-full sm:w-auto border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      {isExternal ? (
                        <a href={wineHref} target="_blank" rel="noopener noreferrer">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Visa vin
                        </a>
                      ) : (
                        <Link href={wineHref}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Visa vin
                        </Link>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Total Price Footer */}
      {showTotalPrice && showPrices && totalPrice > 0 && (
        <Card className="mt-8 border-2 border-orange-200 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/50 via-white to-orange-50/30 dark:from-orange-950/20 dark:via-background dark:to-orange-950/10 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-lg md:text-xl font-bold text-foreground block mb-1">
                  Total kostnad för alla viner
                </span>
                <p className="text-sm text-muted-foreground">
                  Ungefärlig totalkostnad för att köpa alla viner som behövs för denna vinprovning.
                </p>
              </div>
              <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
                <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {shoppingListUrl && (
        <div className="mt-6 flex justify-center">
          <Button
            asChild
            size="lg"
          >
            <a href={shoppingListUrl} target="_blank" rel="noopener noreferrer">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Till Systembolaget
              <ExternalLink className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}
