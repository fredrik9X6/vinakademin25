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
  const [tab, setTab] = React.useState<'library' | 'custom'>('library')
  const [q, setQ] = React.useState('')
  const [results, setResults] = React.useState<LibraryWineResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [custom, setCustom] = React.useState<CustomWineInput>({ name: '' })

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

  return (
    <div className="rounded-md border bg-card p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'library' | 'custom')}>
        <TabsList className="mb-3">
          <TabsTrigger value="library">Från biblioteket</TabsTrigger>
          <TabsTrigger value="custom">Eget vin</TabsTrigger>
        </TabsList>

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
                    {r.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex-shrink-0" />
                    )}
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
