/**
 * Walks a Lexical/blocks JSON tree and returns true if it references the given
 * wine via a `wine-reference` block, a `wine-list` block, an internal-link
 * relationship, or a plain link to /vinlistan/<slug|id>.
 *
 * Replaces the brittle `JSON.stringify(...).includes(wineId)` pattern that
 * matched substrings inside unrelated numbers/text.
 */
export function contentReferencesWine(
  content: unknown,
  wineId: number | string,
  wineSlug?: string,
): boolean {
  if (!content || typeof content !== 'object') return false
  const wineIdStr = String(wineId)
  const wineSlugStr = wineSlug ? String(wineSlug) : ''

  const getRelId = (w: any): string | null => {
    if (!w) return null
    if (typeof w === 'string' || typeof w === 'number') return String(w)
    if (typeof w === 'object') {
      if (w.id) return String(w.id)
      if (w.value) return String(typeof w.value === 'object' ? (w.value.id ?? w.value) : w.value)
      if (w.doc && w.doc.id) return String(w.doc.id)
    }
    return null
  }

  const stack: any[] = [content]
  while (stack.length) {
    const node = stack.pop()
    if (!node || typeof node !== 'object') continue

    const blockType =
      (node as any).blockType ||
      (node as any).blockName ||
      (node as any)?.fields?.blockType ||
      (node as any)?.fields?.blockName

    // wine-reference: single `wine` field
    const isWineRefBlock =
      blockType === 'wine-reference' ||
      blockType === 'WineReference' ||
      (node as any).type === 'wine-reference' ||
      ((node as any).type === 'block' && (node as any).fields?.blockType === 'wine-reference')

    if (isWineRefBlock) {
      const wRaw =
        (node as any).fields?.wine ??
        (node as any).wine ??
        (node as any).fields?.data?.wine ??
        (node as any).fields?.fields?.wine
      const wid = getRelId(wRaw)
      if (wid && wid === wineIdStr) return true
      if (wRaw && typeof wRaw === 'object') {
        const wslug = String((wRaw as any).slug || '')
        if (wslug && wslug === wineSlugStr) return true
      }
    }

    // wine-list: array of wines under `wines` (hasMany relation)
    const isWineListBlock =
      blockType === 'wine-list' ||
      blockType === 'WineList' ||
      (node as any).type === 'wine-list' ||
      ((node as any).type === 'block' && (node as any).fields?.blockType === 'wine-list')

    if (isWineListBlock) {
      const list =
        (node as any).fields?.wines ??
        (node as any).wines ??
        (node as any).fields?.data?.wines ??
        []
      if (Array.isArray(list)) {
        for (const w of list) {
          const wid = getRelId(w)
          if (wid && wid === wineIdStr) return true
          if (wineSlugStr && w && typeof w === 'object' && String((w as any).slug || '') === wineSlugStr) {
            return true
          }
        }
      }
    }

    // Plain link to /vinlistan/<slug|id>
    const url: string | undefined =
      ((node as any).url || (node as any).href || (node as any)?.fields?.url) &&
      String((node as any).url || (node as any).href || (node as any)?.fields?.url)
    if (
      url &&
      ((wineSlugStr && url.includes(`/vinlistan/${wineSlugStr}`)) ||
        url.includes(`/vinlistan/${wineIdStr}`))
    ) {
      return true
    }

    // Internal-link node with `doc` relation to wines
    const doc = (node as any).doc || (node as any)?.fields?.doc
    if (doc && (doc.relationTo === 'wines' || doc.relationTo === 'wine')) {
      const docVal = doc.value || doc.id
      const wid = getRelId(docVal)
      if (wid && wid === wineIdStr) return true
    }

    for (const key of Object.keys(node)) {
      const val = (node as any)[key]
      if (val && typeof val === 'object') stack.push(val)
      if (Array.isArray(val)) val.forEach((v) => stack.push(v))
    }
  }
  return false
}
