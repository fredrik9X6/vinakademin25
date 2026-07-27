/**
 * Filter state for the merged Provningar surface (/provningsmallar).
 *
 * One builder for every filter link on the page. Before this existed the page
 * had two ad-hoc query-string builders (`pillHref`, `statusHref`) plus inline
 * hrefs inside TagFilter; adding the `visa` dimension by hand to all three
 * would reliably leave one of them dropping it, silently throwing the user
 * back to Alla mid-browse.
 *
 * Secondary filters are scoped to the view that can act on them: tag/access/
 * status are template concepts, showArchived is a plan concept. Switching view
 * drops whatever no longer applies, so a URL never claims a filter the visible
 * list ignores.
 *
 * Spec: docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md (D1, D8)
 */
export type ProvningarView = 'alla' | 'mina' | 'mallar'

export interface ProvningarFilterState {
  view: ProvningarView
  /** Template tag filter. */
  tag: string | null
  /** Template access-level filter. */
  access: 'free' | 'paid' | null
  /** Admin-only: show template drafts instead of published. */
  status: 'draft' | null
  /** Plan-only: include archived plans. */
  showArchived: boolean
}

export function viewIncludesPlans(view: ProvningarView): boolean {
  return view === 'alla' || view === 'mina'
}

export function viewIncludesTemplates(view: ProvningarView): boolean {
  return view === 'alla' || view === 'mallar'
}

export function parseProvningarFilters(
  sp: Record<string, string | undefined>,
): ProvningarFilterState {
  const rawView = sp.visa
  const view: ProvningarView =
    rawView === 'mina' || rawView === 'mallar' ? rawView : 'alla'
  const tag = (sp.tag || '').trim() || null
  const access = sp.access === 'free' || sp.access === 'paid' ? sp.access : null
  const status = sp.status === 'draft' ? 'draft' : null
  return { view, tag, access, status, showArchived: sp.showArchived === '1' }
}

export function buildProvningarHref(
  current: ProvningarFilterState,
  patch: Partial<ProvningarFilterState>,
): string {
  const next: ProvningarFilterState = { ...current, ...patch }

  // Drop filters the resulting view cannot act on.
  if (!viewIncludesTemplates(next.view)) {
    next.tag = null
    next.access = null
    next.status = null
  }
  if (!viewIncludesPlans(next.view)) {
    next.showArchived = false
  }

  // Deterministic order so hrefs are stable and assertable.
  const params = new URLSearchParams()
  if (next.view !== 'alla') params.set('visa', next.view)
  if (next.tag) params.set('tag', next.tag)
  if (next.access) params.set('access', next.access)
  if (next.status) params.set('status', next.status)
  if (next.showArchived) params.set('showArchived', '1')

  // URLSearchParams encodes spaces as "+"; Next and the tag filter both round-trip
  // "%20" cleanly, so normalise to percent-encoding for stable, readable URLs.
  const qs = params.toString().replace(/\+/g, '%20')
  return qs ? `/provningsmallar?${qs}` : '/provningsmallar'
}
