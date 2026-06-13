/**
 * Walk a Lexical rich-text tree (typically course.fullDescription) and return
 * an aggregate over every `wine-list` block — total wine count and summed SEK
 * price. Used by the visitor course detail page to show non-purchasers "X
 * wines · ~Y kr" without revealing wine identities.
 *
 * Robust to malformed/partial trees (returns zeros), missing prices (treated
 * as 0), and the various places the block payload can live in Payload's
 * Lexical output (`fields.wines`, `wines`, `fields.data.wines`).
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D5)
 */
export interface WineAggregate {
  count: number
  totalSek: number
}

const ZERO: WineAggregate = { count: 0, totalSek: 0 }

export function getCourseWineAggregate(content: unknown): WineAggregate {
  if (!content || typeof content !== 'object') return ZERO

  let count = 0
  let totalSek = 0

  const stack: unknown[] = [content]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    const n = node as Record<string, unknown>
    const fields = (n.fields as Record<string, unknown> | undefined) || undefined

    const blockType =
      (n.blockType as string | undefined) ||
      (n.blockName as string | undefined) ||
      (fields?.blockType as string | undefined) ||
      (fields?.blockName as string | undefined)

    const isWineListBlock =
      blockType === 'wine-list' ||
      blockType === 'WineList' ||
      n.type === 'wine-list' ||
      (n.type === 'block' && fields?.blockType === 'wine-list')

    if (isWineListBlock) {
      const wines = readWines(node)
      for (const wine of wines) {
        count += 1
        const price = readWinePrice(wine)
        if (typeof price === 'number' && Number.isFinite(price)) {
          totalSek += price
        }
      }
      // Do NOT recurse into the wine-list payload. The same node's `fields`
      // object also satisfies the isWineListBlock check via fields.blockType,
      // and each wine object would be pushed back onto the stack — causing
      // double counts. We've already pulled what we need.
      continue
    }

    for (const key of Object.keys(n)) {
      const val = n[key]
      if (Array.isArray(val)) {
        for (const v of val) if (v && typeof v === 'object') stack.push(v)
      } else if (val && typeof val === 'object') {
        stack.push(val)
      }
    }
  }

  return { count, totalSek }
}

function readWines(node: unknown): unknown[] {
  if (!node || typeof node !== 'object') return []
  const n = node as Record<string, unknown>
  const fields = (n.fields as Record<string, unknown> | undefined) || undefined
  const candidate =
    (fields?.wines as unknown) ??
    (n.wines as unknown) ??
    ((fields?.data as Record<string, unknown> | undefined)?.wines as unknown)
  return Array.isArray(candidate) ? candidate : []
}

function readWinePrice(wine: unknown): number | undefined {
  if (!wine) return undefined
  if (typeof wine === 'number' || typeof wine === 'string') return undefined
  const w = wine as Record<string, unknown>
  const raw = w.price
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
