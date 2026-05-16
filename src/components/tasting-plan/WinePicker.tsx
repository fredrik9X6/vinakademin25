'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export type CustomWineInput = {
  name: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
  /**
   * Set when the snapshot was populated from the Systembolaget product picker.
   * Carries the stable Systembolaget product number so we can later promote it
   * to the curated `wines` collection or run analytics across reviews.
   */
  systembolagetProductNumber?: string
  /**
   * Bottle image URL — set when the snapshot came from the Systembolaget picker.
   * For hand-typed custom wines this is left empty.
   */
  imageUrl?: string
}

/**
 * Systembolaget CDN URLs come back from upstream without a file extension
 * (e.g. .../productimages/47017/47017). The CDN serves a 400px thumbnail at
 * `_400.png` and the full image at `.png`. We use the thumbnail variant for
 * picker dropdown and saved-snapshot use; consumers can build the full URL
 * by swapping the suffix when they need a larger render.
 */
function buildThumbnailUrl(baseUrl: string | null): string | undefined {
  if (!baseUrl) return undefined
  if (/\.(png|jpg|jpeg|webp)$/i.test(baseUrl)) return baseUrl
  return `${baseUrl}_400.png`
}

type SystembolagetHit = {
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

const SYSTEMBOLAGET_TYPE_MAP: Record<string, NonNullable<CustomWineInput['type']>> = {
  'Rött vin': 'red',
  'Vitt vin': 'white',
  'Rosévin': 'rose',
  'Mousserande vin': 'sparkling',
  'Starkvin': 'fortified',
  'Sött vin / dessertvin': 'dessert',
  'Aromatiserat vin': 'other',
  'Orangevin': 'other',
}

function projectSystembolagetToCustom(hit: SystembolagetHit): CustomWineInput {
  const name = [hit.productNameBold, hit.productNameThin].filter(Boolean).join(' ').trim()
  return {
    name: name || `Produkt ${hit.productNumber}`,
    producer: hit.producerName || undefined,
    vintage: hit.vintage != null ? String(hit.vintage) : undefined,
    type: hit.categoryLevel2 ? SYSTEMBOLAGET_TYPE_MAP[hit.categoryLevel2] : undefined,
    systembolagetUrl: hit.productUrl || undefined,
    priceSek: hit.price ?? undefined,
    systembolagetProductNumber: hit.productNumber,
    imageUrl: buildThumbnailUrl(hit.imageUrl),
  }
}

export type LibraryWineResult = {
  id: number
  title: string
  producer: string | null
  vintage: string | number | null
  region: string | null
  thumbnailUrl: string | null
}

export interface WinePickerProps {
  onPickLibrary: (wine: LibraryWineResult) => void
  onPickCustom: (wine: CustomWineInput) => void
  disabled?: boolean
}

const WINE_TYPE_OPTIONS: Array<{ value: NonNullable<CustomWineInput['type']>; label: string }> = [
  { value: 'red', label: 'Rött' },
  { value: 'white', label: 'Vitt' },
  { value: 'rose', label: 'Rosé' },
  { value: 'sparkling', label: 'Mousserande' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'fortified', label: 'Fortifierat' },
  { value: 'other', label: 'Annat' },
]

export function WinePicker({ onPickLibrary, onPickCustom, disabled }: WinePickerProps) {
  const [tab, setTab] = React.useState<'library' | 'systembolaget' | 'custom'>('systembolaget')
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<LibraryWineResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [custom, setCustom] = React.useState<CustomWineInput>({ name: '' })

  // Systembolaget search state — independent query so switching tabs doesn't
  // clobber the in-progress query in the other tab.
  const [sbQ, setSbQ] = React.useState('')
  const [sbResults, setSbResults] = React.useState<SystembolagetHit[]>([])
  const [sbLoading, setSbLoading] = React.useState(false)

  React.useEffect(() => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    let aborted = false
    setLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wines/search?q=${encodeURIComponent(q)}`)
        if (!res.ok) {
          if (!aborted) setResults([])
          return
        }
        const data = await res.json()
        if (!aborted) setResults(data.results || [])
      } finally {
        if (!aborted) setLoading(false)
      }
    }, 300)
    return () => {
      aborted = true
      clearTimeout(handle)
    }
  }, [q])

  React.useEffect(() => {
    if (sbQ.trim().length < 2) {
      setSbResults([])
      return
    }
    let aborted = false
    setSbLoading(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/systembolaget-products/search?q=${encodeURIComponent(sbQ)}`,
          { credentials: 'include' },
        )
        if (!res.ok) {
          if (!aborted) setSbResults([])
          return
        }
        const data = await res.json()
        if (!aborted) setSbResults(data.results || [])
      } finally {
        if (!aborted) setSbLoading(false)
      }
    }, 300)
    return () => {
      aborted = true
      clearTimeout(handle)
    }
  }, [sbQ])

  return (
    <div className="rounded-md border bg-card p-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as 'library' | 'systembolaget' | 'custom')}
      >
        <TabsList className="mb-3 grid w-full grid-cols-3">
          <TabsTrigger value="systembolaget">
            <span className="sm:hidden">Systembolaget</span>
            <span className="hidden sm:inline">Sök Systembolaget</span>
          </TabsTrigger>
          <TabsTrigger value="library">
            <span className="sm:hidden">Bibliotek</span>
            <span className="hidden sm:inline">Från biblioteket</span>
          </TabsTrigger>
          <TabsTrigger value="custom">Eget vin</TabsTrigger>
        </TabsList>

        <TabsContent value="systembolaget" className="space-y-2">
          <Input
            placeholder="Sök på namn, producent eller produktnummer…"
            value={sbQ}
            onChange={(e) => setSbQ(e.target.value)}
            disabled={disabled}
            aria-label="Sök på Systembolaget"
          />
          {sbLoading && <p className="text-xs text-muted-foreground">Söker…</p>}
          {!sbLoading && sbQ.trim().length >= 2 && sbResults.length === 0 && (
            <p className="text-xs text-muted-foreground">Inga träffar.</p>
          )}
          {sbResults.length > 0 && (
            <ul className="max-h-72 overflow-y-auto divide-y rounded-md border">
              {sbResults.map((r) => {
                const thumbUrl = buildThumbnailUrl(r.imageUrl)
                const headline = [r.productNameBold, r.productNameThin]
                  .filter(Boolean)
                  .join(' ')
                const meta = [
                  r.producerName,
                  r.vintage,
                  r.categoryLevel2,
                  r.country,
                  r.price != null ? `${r.price} kr` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <li key={r.productNumber}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3 disabled:opacity-50"
                      disabled={disabled}
                      onClick={() => {
                        onPickCustom(projectSystembolagetToCustom(r))
                        setSbQ('')
                        setSbResults([])
                      }}
                    >
                      <div className="flex-shrink-0 w-10 h-12 rounded-md overflow-hidden bg-muted relative">
                        {thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-contain p-1"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{headline}</p>
                        <p className="text-xs text-muted-foreground truncate">{meta}</p>
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                        #{r.productNumber}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Vin från Systembolagets sortiment. Träffen läggs till som ett eget vin med
            data från Systembolaget — du kan justera fälten efteråt.
          </p>
        </TabsContent>

        <TabsContent value="library" className="space-y-2">
          <Input
            placeholder="Sök efter titel eller producent…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={disabled}
            aria-label="Sök vin"
          />
          {loading && <p className="text-xs text-muted-foreground">Söker…</p>}
          {!loading && q.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground">Inga träffar.</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto divide-y rounded-md border">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-3 disabled:opacity-50"
                    disabled={disabled}
                    onClick={() => {
                      onPickLibrary(r)
                      setQ('')
                      setResults([])
                    }}
                  >
                    <div className="flex-shrink-0 w-10 h-12 rounded-md overflow-hidden bg-muted relative">
                      {r.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain p-1"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[r.producer, r.vintage, r.region].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-3">
          <div>
            <Label htmlFor="cw-name">Namn *</Label>
            <Input
              id="cw-name"
              value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })}
              placeholder="t.ex. Domaine de Tariquet Classic"
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cw-producer">Producent</Label>
              <Input
                id="cw-producer"
                value={custom.producer || ''}
                onChange={(e) => setCustom({ ...custom, producer: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="cw-vintage">Årgång</Label>
              <Input
                id="cw-vintage"
                value={custom.vintage || ''}
                onChange={(e) => setCustom({ ...custom, vintage: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cw-type">Typ</Label>
              <Select
                value={custom.type ?? ''}
                onValueChange={(v) =>
                  setCustom({ ...custom, type: (v || undefined) as CustomWineInput['type'] })
                }
                disabled={disabled}
              >
                <SelectTrigger id="cw-type">
                  <SelectValue placeholder="Välj typ" />
                </SelectTrigger>
                <SelectContent>
                  {WINE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cw-price">Pris (kr)</Label>
              <Input
                id="cw-price"
                type="number"
                min={0}
                value={custom.priceSek ?? ''}
                onChange={(e) =>
                  setCustom({
                    ...custom,
                    priceSek: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="cw-url">Systembolaget-länk</Label>
            <Input
              id="cw-url"
              type="url"
              value={custom.systembolagetUrl || ''}
              onChange={(e) => setCustom({ ...custom, systembolagetUrl: e.target.value })}
              placeholder="https://www.systembolaget.se/..."
              disabled={disabled}
            />
          </div>
          <Button
            type="button"
            variant="default"
            disabled={disabled || !custom.name.trim()}
            onClick={() => {
              onPickCustom({ ...custom, name: custom.name.trim() })
              setCustom({ name: '' })
            }}
          >
            Lägg till vin
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
