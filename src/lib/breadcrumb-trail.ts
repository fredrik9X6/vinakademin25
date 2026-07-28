/**
 * Pure breadcrumb-trail builder, extracted from breadcrumb-bar.tsx so the
 * label rules are testable.
 *
 * Spec: docs/superpowers/specs/2026-07-27-tasting-information-architecture-design.md (D7)
 */
export interface BreadcrumbEntry {
  label: string
  href: string
  isCurrentPage: boolean
}

export interface BuildTrailInput {
  pathname: string
  /** Title resolved from a TITLE_APIS lookup for a section detail page. */
  resolvedTitle?: string | null
  /** Title resolved for the ?lesson= / ?quiz= param inside the course viewer. */
  resolvedItemTitle?: string | null
  itemKind?: 'lesson' | 'quiz' | null
  itemId?: string | null
}

/**
 * Display label for every first-level path segment. Covers both single-page
 * routes (e.g. `/skapa-provning`) and section roots (e.g. `/vinkurser`).
 * Anything not here falls through to `formatSlug()`.
 */
export const PAGE_LABELS: Record<string, string> = {
  // Section roots
  vinkurser: 'Vinkurser',
  vinprovningar: 'Vinkurser', // legacy URL — middleware 301s but cover the segment for in-flight requests
  kurser: 'Vinkurser',
  provningsmallar: 'Vinprovningar',
  artiklar: 'Artiklar',
  vinlistan: 'Vinlistan',
  regioner: 'Regioner',
  lander: 'Länder',
  // Sections without a detail-title API
  'mina-provningar': 'Mina vinprovningar',
  'mina-vinkurser': 'Mina vinkurser',
  'mina-recensioner': 'Mina recensioner',
  'mina-sidor': 'Mina sidor',
  profil: 'Profil',
  checkout: 'Kassa',
  // Standalone single-page routes
  'recensera-vin': 'Recensera vin',
  'skapa-provning': 'Skapa egen',
  vinhoroskop: 'Vinhoroskop',
  vinkompassen: 'Vinhoroskop', // legacy segment — middleware 301s, but cover in-flight requests
  'grunderna-i-vin': 'Grunderna i vin',
  'om-oss': 'Om oss',
  kontakt: 'Kontakt',
  nyhetsbrev: 'Nyhetsbrev',
  hjalp: 'Hjälp',
  villkor: 'Villkor',
  integritetspolicy: 'Integritetspolicy',
  cookies: 'Cookies',
  sok: 'Sök',
  installningar: 'Inställningar',
  styleguide: 'Designsystem',
  delta: 'Delta',
  join: 'Anslut',
  internt: 'Internt',
  // Auth routes
  'logga-in': 'Logga in',
  registrera: 'Registrera',
  'glomt-losenord': 'Glömt lösenord',
  'aterstall-losenord': 'Återställ lösenord',
  'verifiera-epost': 'Verifiera e-post',
  'verifiera-epost-meddelande': 'Verifiera e-post',
  'aktivera-konto': 'Aktivera konto',
  onboarding: 'Onboarding',
}

/**
 * Root-level routes that belong under a section they are not nested in.
 * `/skapa-provning` is reached from the Provningar gallery, so its trail should
 * say so rather than dangling off Hem.
 */
export const PARENT_SECTIONS: Record<string, { label: string; href: string }> = {
  'skapa-provning': { label: 'Vinprovningar', href: '/provningsmallar' },
}

/**
 * First-level segment → href override for the crumb that segment produces.
 *
 * Exists because a segment's *accumulated* path can itself be a middleware
 * redirect to a different product. `/mina-provningar` 301s to
 * `/mina-vinkurser` (video courses), but the "Mina provningar" label still
 * appears on live pages nested under the old prefix (historik, planer/[id]).
 * Without an override, that crumb would link readers into the wrong
 * product. Point it at the same destination `/mina-provningar/planer`
 * itself 301s to, so label and destination agree.
 */
export const SECTION_HREF_OVERRIDES: Record<string, string> = {
  'mina-provningar': '/provningsmallar?visa=mina',
}

export const SUB_LABELS: Record<string, Record<string, string>> = {
  provningsmallar: {
    ny: 'Skapa ny mall',
    redigera: 'Redigera mall',
  },
  'mina-provningar': {
    historik: 'Historik',
    planer: 'Planer',
  },
  artiklar: {
    kategori: 'Kategori',
    tagg: 'Tagg',
  },
  vinhoroskop: {
    resultat: 'Resultat',
  },
  vinkompassen: {
    resultat: 'Resultat',
  },
  checkout: {
    success: 'Betalning genomförd',
  },
  'skapa-provning': {},
}

/** Which sections resolve a slug → title via API for the detail breadcrumb. */
export const TITLE_APIS: Record<string, string> = {
  vinkurser: '/api/vinkurser/title',
  vinprovningar: '/api/vinkurser/title', // legacy
  kurser: '/api/vinkurser/title',
  artiklar: '/api/blog-posts/title',
  vinlistan: '/api/wines/title',
  regioner: '/api/regions/title',
  lander: '/api/countries/title',
}

/** Friendly fallback: "skapa-provning" → "Skapa provning". */
function formatSlug(slug: string): string {
  const spaced = slug.replace(/-/g, ' ').trim()
  if (!spaced) return ''
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/** Numeric id segment — hidden from the trail (e.g. /provningsmallar/redigera/123). */
function isNumericId(s: string): boolean {
  return /^\d+$/.test(s)
}

export function buildBreadcrumbTrail(input: BuildTrailInput): BreadcrumbEntry[] {
  const { pathname, resolvedTitle = null, resolvedItemTitle = null } = input
  const itemKind = input.itemKind ?? null
  const itemId = input.itemId ?? null

  if (pathname === '/') return []

  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbEntry[] = [{ label: 'Hem', href: '/', isCurrentPage: false }]

  const parent = pathSegments[0] ? PARENT_SECTIONS[pathSegments[0]] : undefined
  if (parent) {
    breadcrumbs.push({ label: parent.label, href: parent.href, isCurrentPage: false })
  }

  let currentPath = ''
  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i]
    currentPath += `/${segment}`

    if (i > 0 && isNumericId(segment)) continue

    const isLast = i === pathSegments.length - 1
    const section = pathSegments[0]

    let label: string
    if (i === 0) {
      label = PAGE_LABELS[segment] ?? formatSlug(segment)
    } else if (SUB_LABELS[section]?.[segment]) {
      label = SUB_LABELS[section][segment]
    } else if (i === 1 && section && TITLE_APIS[section]) {
      label = resolvedTitle ?? formatSlug(segment)
    } else {
      label = formatSlug(segment)
    }

    const href = i === 0 ? (SECTION_HREF_OVERRIDES[segment] ?? currentPath) : currentPath
    breadcrumbs.push({ label, href, isCurrentPage: isLast && !itemKind })
  }

  // Append the active lesson / quiz inside the course viewer.
  if (
    itemKind &&
    itemId &&
    (pathSegments[0] === 'kurser' ||
      pathSegments[0] === 'vinkurser' ||
      pathSegments[0] === 'vinprovningar') &&
    pathSegments[1]
  ) {
    const fallback = itemKind === 'quiz' ? `Quiz ${itemId}` : `Moment ${itemId}`
    breadcrumbs.push({
      label: resolvedItemTitle ?? fallback,
      href: `${pathname}?${itemKind}=${itemId}`,
      isCurrentPage: true,
    })
    if (breadcrumbs.length > 2) {
      breadcrumbs[breadcrumbs.length - 2].isCurrentPage = false
    }
  }

  // Numeric segments were skipped, so the last surviving crumb may not have
  // been flagged in the loop.
  if (!itemKind && breadcrumbs.length > 1) {
    breadcrumbs[breadcrumbs.length - 1].isCurrentPage = true
  }

  return breadcrumbs
}
