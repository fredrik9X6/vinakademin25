/**
 * Permanent redirects for the 2026-07-27 tasting IA consolidation.
 *
 * EXACT MATCH ONLY. The surrounding middleware uses
 * `pathname === X || pathname.startsWith(X + '/')` for its other 301s; that
 * idiom is wrong here and dangerous:
 *   - a prefix match on `/mina-provningar/planer` swallows
 *     `/mina-provningar/planer/[id]`, the live tasting session (and its
 *     `/handlingslista`), whose URLs guests already hold via join links;
 *   - a prefix match on `/mina-provningar` swallows all of the above plus
 *     `/mina-provningar/historik/[id]`, the guest recap.
 *
 * Kept as a pure function so those cases are covered by
 * src/lib/tasting-route-redirects.test.ts rather than by hoping.
 *
 * Spec: docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md (D6)
 */
export interface TastingRedirect {
  /** Destination path, without query string. */
  pathname: string
  /**
   * Params to SET on the destination. The caller preserves the incoming query
   * string, so e.g. `?showArchived=1` survives the hop to `?visa=mina&showArchived=1`.
   */
  setParams?: Record<string, string>
  status: 301
}

/** Exact source path → redirect. Never consulted with a prefix. */
const RULES: Record<string, TastingRedirect> = {
  // The root of this namespace renders purchased VIDEO COURSES, not tastings.
  '/mina-provningar': { pathname: '/mina-vinkurser', status: 301 },
  // The plans index is now a filtered view of the merged gallery.
  '/mina-provningar/planer': {
    pathname: '/provningsmallar',
    setParams: { visa: 'mina' },
    status: 301,
  },
}

export function resolveTastingRedirect(pathname: string): TastingRedirect | null {
  // Next normalises trailing slashes by default, but a redirect that only
  // fires on one of the two spellings is a silent hole — normalise anyway.
  const normalised =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return RULES[normalised] ?? null
}
