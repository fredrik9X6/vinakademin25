'use client'

import { useEffect, useState } from 'react'
import { GRAPES as STATIC_GRAPES } from './blind-guess-vocab'

/**
 * Grape names fetched from the `grapes` collection.
 *
 * Replaces the static `GRAPES` constant from blind-guess-vocab so any
 * admin-curated grape (e.g. Macabeu, Carignan, Petit Verdot) is available
 * in the blind-tasting host picker + guest guess dropdown without a code
 * deploy. Falls back to the static list if the API fails.
 *
 * Cached in module scope so re-renders don't refetch.
 */

let cachedGrapes: ReadonlyArray<string> | null = null
let inflight: Promise<ReadonlyArray<string>> | null = null

async function fetchGrapes(): Promise<ReadonlyArray<string>> {
  if (cachedGrapes) return cachedGrapes
  if (inflight) return inflight
  inflight = (async (): Promise<ReadonlyArray<string>> => {
    let result: ReadonlyArray<string>
    try {
      const res = await fetch('/api/grapes?limit=500&depth=0&sort=name', {
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const docs: unknown[] = Array.isArray(json?.docs) ? json.docs : []
      const names: string[] = []
      for (const d of docs) {
        const n = (d as { name?: unknown })?.name
        if (typeof n === 'string' && n.trim().length > 0) names.push(n.trim())
      }
      const unique = Array.from(new Set(names))
      unique.sort((a, b) => a.localeCompare(b, 'sv'))
      result = unique.length > 0 ? unique : Array.from(STATIC_GRAPES)
    } catch {
      result = Array.from(STATIC_GRAPES)
    } finally {
      inflight = null
    }
    cachedGrapes = result
    return result
  })()
  return inflight
}

export function useGrapes(): { grapes: ReadonlyArray<string>; loading: boolean } {
  const [grapes, setGrapes] = useState<ReadonlyArray<string>>(() => cachedGrapes ?? STATIC_GRAPES)
  const [loading, setLoading] = useState<boolean>(() => !cachedGrapes)

  useEffect(() => {
    if (cachedGrapes) {
      setGrapes(cachedGrapes)
      setLoading(false)
      return
    }
    let cancelled = false
    fetchGrapes().then((list) => {
      if (cancelled) return
      setGrapes(list)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { grapes, loading }
}
