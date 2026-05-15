'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useForm } from '@payloadcms/ui'

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

type ApplyResult = {
  name: string
  winery: string | null
  vintage: number | null
  nonVintage: boolean
  type: string | null
  price: number | null
  systembolagetUrl: string | null
  image: number | null
  country: number | null
  region: number | null
  grapes: number[]
  diagnostics: {
    countryName: string | null
    regionName: string | null
    grapeNames: string[]
    countryCreated: boolean
    regionCreated: boolean
    grapesCreated: string[]
    imageSource: string
  }
}

function buildThumbnailUrl(baseUrl: string | null): string | undefined {
  if (!baseUrl) return undefined
  if (/\.(png|jpg|jpeg|webp)$/i.test(baseUrl)) return baseUrl
  return `${baseUrl}_400.png`
}

export const SystembolagetWinePickerField: React.FC = () => {
  const { dispatchFields } = useForm()

  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SystembolagetHit[]>([])
  const [searching, setSearching] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [status, setStatus] = useState<{
    kind: 'idle' | 'success' | 'error'
    message: string
    details?: ApplyResult['diagnostics']
  }>({ kind: 'idle', message: '' })

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    let aborted = false
    setSearching(true)
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/systembolaget-products/search?q=${encodeURIComponent(q)}`,
          { credentials: 'include' },
        )
        if (!res.ok) {
          if (!aborted) setResults([])
          return
        }
        const data = await res.json()
        if (!aborted) setResults(data.results || [])
      } finally {
        if (!aborted) setSearching(false)
      }
    }, 300)
    return () => {
      aborted = true
      clearTimeout(handle)
    }
  }, [q, open])

  const applyProduct = useCallback(
    async (hit: SystembolagetHit) => {
      setApplying(hit.productNumber)
      setStatus({ kind: 'idle', message: '' })
      try {
        const res = await fetch('/api/systembolaget-products/apply-to-wine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productNumber: hit.productNumber }),
        })
        const data: ApplyResult | { error: string } = await res.json()
        if (!res.ok) {
          throw new Error(('error' in data && data.error) || `HTTP ${res.status}`)
        }
        const result = data as ApplyResult

        // Dispatch updates for every populated field.
        const update = (path: string, value: unknown) =>
          dispatchFields({ type: 'UPDATE', path, value })

        update('name', result.name)
        if (result.winery) update('winery', result.winery)
        update('vintage', result.vintage)
        update('nonVintage', result.nonVintage)
        if (result.type) update('type', result.type)
        if (result.price != null) update('price', result.price)
        if (result.systembolagetUrl) update('systembolagetUrl', result.systembolagetUrl)
        if (result.image != null) update('image', result.image)
        if (result.country != null) update('country', result.country)
        if (result.region != null) update('region', result.region)
        if (result.grapes.length > 0) update('grapes', result.grapes)

        setStatus({
          kind: 'success',
          message: `Fylld i från Systembolaget #${hit.productNumber}.`,
          details: result.diagnostics,
        })
        setOpen(false)
        setQ('')
        setResults([])
      } catch (err) {
        setStatus({
          kind: 'error',
          message: (err as Error).message || 'Kunde inte hämta produkten.',
        })
      } finally {
        setApplying(null)
      }
    },
    [dispatchFields],
  )

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {!open ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            🔍 Sök på Systembolaget
          </button>
          {status.kind === 'success' && (
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: '0.875rem', color: '#166534', margin: 0 }}>
                ✓ {status.message}
              </p>
              {status.details && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0' }}>
                  Land: {status.details.countryName || '—'}
                  {status.details.countryCreated && ' (ny)'}
                  {' · '}
                  Region: {status.details.regionName || '—'}
                  {status.details.regionCreated && ' (ny)'}
                  {' · '}
                  Druvor: {status.details.grapeNames.length || '0'}
                  {status.details.grapesCreated.length > 0 &&
                    ` (${status.details.grapesCreated.length} nya)`}
                  {' · '}
                  Bild: {status.details.imageSource}
                </p>
              )}
            </div>
          )}
          {status.kind === 'error' && (
            <p style={{ fontSize: '0.875rem', color: '#991b1b', margin: 0 }}>
              ✗ {status.message}
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '1rem',
            backgroundColor: '#f9fafb',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input
              type="text"
              autoFocus
              placeholder="Sök på namn, producent eller produktnummer…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
              }}
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setQ('')
                setResults([])
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Avbryt
            </button>
          </div>

          {searching && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0' }}>Söker…</p>
          )}
          {!searching && q.trim().length >= 2 && results.length === 0 && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0' }}>
              Inga träffar.
            </p>
          )}
          {results.length > 0 && (
            <ul
              style={{
                maxHeight: '320px',
                overflowY: 'auto',
                margin: 0,
                padding: 0,
                listStyle: 'none',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                backgroundColor: '#fff',
              }}
            >
              {results.map((r) => {
                const thumb = buildThumbnailUrl(r.imageUrl)
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
                const isApplying = applying === r.productNumber
                return (
                  <li
                    key={r.productNumber}
                    style={{ borderBottom: '1px solid #f3f4f6' }}
                  >
                    <button
                      type="button"
                      disabled={!!applying}
                      onClick={() => applyProduct(r)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: 'none',
                        cursor: applying ? 'wait' : 'pointer',
                        opacity: applying && !isApplying ? 0.5 : 1,
                        textAlign: 'left',
                      }}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'contain',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p
                          style={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {headline}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            margin: '0.125rem 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {meta}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#9ca3af',
                          fontVariantNumeric: 'tabular-nums',
                          flexShrink: 0,
                        }}
                      >
                        {isApplying ? 'Fyller i…' : `#${r.productNumber}`}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.75rem 0 0' }}>
            Vid val: hämtar namn, producent, årgång, typ, pris, länk och bild. Land/region/druvor
            kopplas till befintliga rader (eller skapas om de saknas).
          </p>
        </div>
      )}
    </div>
  )
}

export default SystembolagetWinePickerField
