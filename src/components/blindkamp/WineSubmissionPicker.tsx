'use client'
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ThemeValue } from './ThemePicker'

// Shape returned by /api/systembolaget-products/search
interface SystembolagetHit {
  productNumber: string
  productNameBold: string | null
  productNameThin: string | null
  producerName: string | null
  vintage: number | null
  country: string | null
  categoryLevel1: string | null
  categoryLevel2: string | null
  price: number | null
  volume: number | null
  alcoholPercentage: number | null
  imageUrl: string | null
  productUrl: string | null
}

// Maps our wineType to Systembolaget's categoryLevel2 filter values.
// 'orange' has no dedicated Systembolaget subtype — it comes back unfiltered
// under "Vitt vin" so we leave it as no subtype filter and describe in the
// theme description field instead.
const WINE_TYPE_TO_SUBTYPE: Record<ThemeValue['wineType'], string | null> = {
  any: null,
  red: 'Rött vin',
  white: 'Vitt vin',
  rose: 'Rosévin',
  sparkling: 'Mousserande vin',
  orange: null, // no dedicated Systembolaget subtype
  dessert: 'Dessertvin',
}

function buildThumbnailUrl(baseUrl: string | null): string | undefined {
  if (!baseUrl) return undefined
  if (/\.(png|jpg|jpeg|webp)$/i.test(baseUrl)) return baseUrl
  return `${baseUrl}_400.png`
}

export interface SubmissionValue {
  systembolagetProductNumber: string | null
  customName: string
  customProducer: string
  customVintage: string
  customPriceSek: number | null
  customType: 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'dessert' | ''
}

export function WineSubmissionPicker({
  theme,
  value,
  onChange,
}: {
  theme: ThemeValue
  value: SubmissionValue
  onChange: (v: SubmissionValue) => void
}) {
  const [mode, setMode] = React.useState<'systembolaget' | 'custom'>('systembolaget')
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<SystembolagetHit[]>([])
  const [searching, setSearching] = React.useState(false)
  const [selectedHit, setSelectedHit] = React.useState<SystembolagetHit | null>(null)

  // Debounced search against the existing API, passing the theme's subtype
  React.useEffect(() => {
    if (mode !== 'systembolaget') return
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    let aborted = false
    setSearching(true)

    const subtype = WINE_TYPE_TO_SUBTYPE[theme.wineType]
    const url = new URL('/api/systembolaget-products/search', window.location.origin)
    url.searchParams.set('q', q)
    if (subtype) url.searchParams.set('subtype', subtype)

    const handle = setTimeout(async () => {
      try {
        const res = await fetch(url.toString(), { credentials: 'include' })
        if (!res.ok) {
          if (!aborted) setResults([])
          return
        }
        const data = await res.json()
        let hits: SystembolagetHit[] = data.results || []

        // Client-side price filter against theme bounds
        if (theme.priceMinSek != null) {
          hits = hits.filter((h) => h.price != null && h.price >= theme.priceMinSek!)
        }
        if (theme.priceMaxSek != null) {
          hits = hits.filter((h) => h.price != null && h.price <= theme.priceMaxSek!)
        }

        if (!aborted) setResults(hits)
      } finally {
        if (!aborted) setSearching(false)
      }
    }, 300)

    return () => {
      aborted = true
      clearTimeout(handle)
    }
  }, [q, mode, theme.wineType, theme.priceMinSek, theme.priceMaxSek])

  function selectHit(hit: SystembolagetHit) {
    setSelectedHit(hit)
    setResults([])
    setQ('')
    onChange({
      ...value,
      systembolagetProductNumber: hit.productNumber,
      customName: [hit.productNameBold, hit.productNameThin].filter(Boolean).join(' '),
      customProducer: hit.producerName ?? '',
      customVintage: hit.vintage != null ? String(hit.vintage) : '',
      customPriceSek: hit.price,
    })
  }

  function clearSelection() {
    setSelectedHit(null)
    onChange({
      ...value,
      systembolagetProductNumber: null,
      customName: '',
      customProducer: '',
      customVintage: '',
      customPriceSek: null,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'systembolaget' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('systembolaget')
            setSelectedHit(null)
          }}
        >
          Sök på Systembolaget
        </Button>
        <Button
          type="button"
          variant={mode === 'custom' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setMode('custom')
            setSelectedHit(null)
            setResults([])
          }}
        >
          Fyll i manuellt
        </Button>
      </div>

      {mode === 'systembolaget' ? (
        <div className="space-y-3">
          {selectedHit ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              {buildThumbnailUrl(selectedHit.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={buildThumbnailUrl(selectedHit.imageUrl)}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded object-contain bg-muted"
                />
              ) : (
                <div className="h-10 w-10 flex-shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {[selectedHit.productNameBold, selectedHit.productNameThin]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    selectedHit.producerName,
                    selectedHit.vintage,
                    selectedHit.price != null ? `${selectedHit.price} kr` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                Byt
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                autoComplete="off"
                placeholder="Sök på namn, producent eller produktnummer…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {searching && (
                <p className="mt-1 text-xs text-muted-foreground">Söker…</p>
              )}
              {!searching && q.trim().length >= 2 && results.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">Inga träffar.</p>
              )}
              {results.length > 0 && (
                <ul className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
                  {results.map((r) => {
                    const thumb = buildThumbnailUrl(r.imageUrl)
                    const headline = [r.productNameBold, r.productNameThin]
                      .filter(Boolean)
                      .join(' ')
                    const meta = [
                      r.producerName,
                      r.vintage,
                      r.categoryLevel2,
                      r.price != null ? `${r.price} kr` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <li key={r.productNumber} className="border-b border-border last:border-0">
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/50"
                          onClick={() => selectHit(r)}
                        >
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-9 w-9 flex-shrink-0 rounded object-contain bg-muted"
                            />
                          ) : (
                            <div className="h-9 w-9 flex-shrink-0 rounded bg-muted" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{headline}</p>
                            <p className="truncate text-xs text-muted-foreground">{meta}</p>
                          </div>
                          <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
                            #{r.productNumber}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}
          {theme.wineType !== 'any' && (
            <p className="text-xs text-muted-foreground">
              Filtrerat på:{' '}
              <span className="font-medium">
                {WINE_TYPE_TO_SUBTYPE[theme.wineType] ?? theme.wineType}
              </span>
              {(theme.priceMinSek != null || theme.priceMaxSek != null) && (
                <>
                  {' · '}
                  {theme.priceMinSek != null && `från ${theme.priceMinSek} kr`}
                  {theme.priceMinSek != null && theme.priceMaxSek != null && ' '}
                  {theme.priceMaxSek != null && `till ${theme.priceMaxSek} kr`}
                </>
              )}
            </p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2 sm:col-span-2">
            <Label>Namn</Label>
            <Input
              value={value.customName}
              onChange={(e) =>
                onChange({ ...value, customName: e.target.value, systembolagetProductNumber: null })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Producent</Label>
            <Input
              value={value.customProducer}
              onChange={(e) => onChange({ ...value, customProducer: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Årgång</Label>
            <Input
              value={value.customVintage}
              onChange={(e) => onChange({ ...value, customVintage: e.target.value })}
              placeholder="2022"
            />
          </div>
          <div className="space-y-2">
            <Label>Pris (kr)</Label>
            <Input
              type="number"
              value={value.customPriceSek ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  customPriceSek: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  )
}
