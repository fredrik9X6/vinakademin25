'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WineImagePlaceholder } from '@/components/wine/WineImagePlaceholder'
import { Search } from 'lucide-react'

export interface LibraryWineHit {
  id: number
  title: string
  producer: string | null
  vintage: string | number | null
  region: string | null
  thumbnailUrl: string | null
}

export interface LibraryWinePickerProps {
  /** Called when the admin picks a wine. */
  onPick: (wine: LibraryWineHit) => void
  disabled?: boolean
}

/**
 * Searches the curated `wines` collection via /api/wines/search (existing,
 * auth-gated). Debounced 250 ms. Used in the admin Template editor where
 * templates must reference library wines.
 */
export function LibraryWinePicker({ onPick, disabled }: LibraryWinePickerProps) {
  const [query, setQuery] = React.useState('')
  const [hits, setHits] = React.useState<LibraryWineHit[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    let aborted = false
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/wines/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((data) => {
          if (aborted) return
          setHits(Array.isArray(data?.results) ? (data.results as LibraryWineHit[]) : [])
        })
        .catch(() => {
          if (!aborted) setHits([])
        })
        .finally(() => {
          if (!aborted) setLoading(false)
        })
    }, 250)
    return () => {
      aborted = true
      clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          placeholder="Sök efter ett vin i biblioteket…"
          disabled={disabled}
          className="pl-9"
        />
      </div>
      {open && query.trim().length >= 2 && (
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Söker…</p>
          ) : hits.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">Inga träffar — prova ett annat ord.</p>
          ) : (
            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(h)
                      setQuery('')
                      setHits([])
                      setOpen(false)
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="relative flex-shrink-0 w-8 h-12 bg-muted/30 rounded overflow-hidden">
                      {h.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                      ) : (
                        <WineImagePlaceholder />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{h.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {[h.producer, h.vintage ? String(h.vintage) : null, h.region]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {open && query.trim().length >= 2 && (
        <div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setQuery('')
              setHits([])
              setOpen(false)
            }}
          >
            Stäng sökresultat
          </Button>
        </div>
      )}
    </div>
  )
}
