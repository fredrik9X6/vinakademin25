'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import React from 'react'

interface BreadcrumbEntry {
  label: string
  href: string
  isCurrentPage: boolean
}

/**
 * Display label for every first-level path segment. Covers both single-page
 * routes (e.g. `/skapa-provning`) and section roots (e.g. `/vinkurser`).
 * Anything not here falls through to `formatSlug()` which does a hyphen-to-
 * space replacement so we never render "Skapa-provning" again.
 */
const PAGE_LABELS: Record<string, string> = {
  // Section roots
  vinkurser: 'Vinkurser',
  vinprovningar: 'Vinkurser', // legacy URL — middleware 301s but cover the segment for any in-flight requests
  kurser: 'Vinkurser',
  provningsmallar: 'Provningsmallar',
  artiklar: 'Artiklar',
  vinlistan: 'Vinlistan',
  regioner: 'Regioner',
  lander: 'Länder',
  // Sections without a detail-title API (or that don't need slug resolution)
  'mina-provningar': 'Mina vinkurser',
  'mina-recensioner': 'Mina recensioner',
  'mina-sidor': 'Mina sidor',
  profil: 'Profil',
  checkout: 'Kassa',
  // Standalone single-page routes
  'recensera-vin': 'Recensera vin',
  'skapa-provning': 'Skapa provning',
  vinkompassen: 'Vinkompassen',
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
  // Auth routes (rarely show breadcrumbs but kept for completeness)
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
 * Static labels for known second-level (and deeper) segments inside a
 * section. Lets us turn `/provningsmallar/ny` into "Skapa ny mall" instead of
 * the crude slug fallback.
 */
const SUB_LABELS: Record<string, Record<string, string>> = {
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
  vinkompassen: {
    resultat: 'Resultat',
  },
  checkout: {
    success: 'Betalning genomförd',
  },
  'skapa-provning': {},
}

/** Which sections resolve a slug → title via API for the detail breadcrumb. */
const TITLE_APIS: Record<string, string> = {
  vinkurser: '/api/vinkurser/title',
  vinprovningar: '/api/vinkurser/title', // legacy
  kurser: '/api/vinkurser/title',
  artiklar: '/api/blog-posts/title',
  vinlistan: '/api/wines/title',
  regioner: '/api/regions/title',
  lander: '/api/countries/title',
}

export function BreadcrumbBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Resolved title for the detail page slug
  const [resolvedTitle, setResolvedTitle] = React.useState<string | null>(null)
  // Resolved title for the lesson/quiz query param (course viewer)
  const [resolvedItemTitle, setResolvedItemTitle] = React.useState<string | null>(null)

  const isHomepage = pathname === '/'

  const lessonId = searchParams.get('lesson')
  const quizId = searchParams.get('quiz')
  const itemKind: 'lesson' | 'quiz' | null = lessonId ? 'lesson' : quizId ? 'quiz' : null
  const itemId = lessonId || quizId

  // Fetch the real title for detail pages
  React.useEffect(() => {
    if (isHomepage) {
      setResolvedTitle(null)
      return
    }

    const pathSegments = pathname.split('/').filter(Boolean)
    const section = pathSegments[0]
    const slug = pathSegments[1]

    const titleApi = section ? TITLE_APIS[section] : undefined
    if (!titleApi || !slug) {
      setResolvedTitle(null)
      return
    }

    const controller = new AbortController()
    ;(async () => {
      try {
        const url = new URL(titleApi, window.location.origin)
        url.searchParams.set('slug', slug)
        if (searchParams.get('preview') === 'true') {
          url.searchParams.set('preview', 'true')
        }

        const res = await fetch(url.toString(), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) {
          setResolvedTitle(null)
          return
        }
        const json = (await res.json().catch(() => null)) as any
        const title = json?.title
        setResolvedTitle(typeof title === 'string' && title.trim() ? title : null)
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
        setResolvedTitle(null)
      }
    })()
    return () => controller.abort()
  }, [pathname, searchParams, isHomepage])

  // Resolve the lesson/quiz title for the course viewer breadcrumb.
  React.useEffect(() => {
    if (!itemId) {
      setResolvedItemTitle(null)
      return
    }
    const controller = new AbortController()
    ;(async () => {
      try {
        const url = new URL('/api/content-items/title', window.location.origin)
        url.searchParams.set('id', itemId)
        const res = await fetch(url.toString(), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) {
          setResolvedItemTitle(null)
          return
        }
        const json = (await res.json().catch(() => null)) as any
        const title = json?.title
        setResolvedItemTitle(typeof title === 'string' && title.trim() ? title : null)
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
        setResolvedItemTitle(null)
      }
    })()
    return () => controller.abort()
  }, [itemId])

  // Hide on homepage — AFTER all hooks have been called
  if (isHomepage) return null

  /** Friendly fallback: "skapa-provning" → "Skapa provning". */
  const formatSlug = (slug: string) => {
    const spaced = slug.replace(/-/g, ' ').trim()
    if (!spaced) return ''
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
  }

  /** Numeric id segment — hide from breadcrumb (e.g. /provningsmallar/redigera/123). */
  const isNumericId = (s: string) => /^\d+$/.test(s)

  // Generate breadcrumb items based on the current path
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbEntry[] = []

    breadcrumbs.push({
      label: 'Hem',
      href: '/',
      isCurrentPage: false,
    })

    let currentPath = ''
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath += `/${segment}`

      // Skip raw numeric ids — they make for ugly breadcrumb crumbs and the
      // previous segment (e.g. "Redigera mall") already conveys the page.
      if (i > 0 && isNumericId(segment)) continue

      const isLast = i === pathSegments.length - 1
      const section = pathSegments[0]

      let label: string
      if (i === 0) {
        // Top-level segment — look up the page label, or fall back to slugify.
        label = PAGE_LABELS[segment] ?? formatSlug(segment)
      } else if (SUB_LABELS[section]?.[segment]) {
        // Known sub-path under a section (e.g. /provningsmallar/ny).
        label = SUB_LABELS[section][segment]
      } else if (i === 1 && section && TITLE_APIS[section]) {
        // Detail page — show the resolved title (or temporary slug).
        label = resolvedTitle ?? formatSlug(segment)
      } else {
        // Generic fallback — slugified human label.
        label = formatSlug(segment)
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrentPage: isLast && !itemKind,
      })
    }

    // Append the active lesson / quiz inside the course viewer.
    if (
      itemKind &&
      itemId &&
      (pathSegments[0] === 'kurser' || pathSegments[0] === 'vinkurser' || pathSegments[0] === 'vinprovningar') &&
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

    // If we trimmed numeric id segments, the last remaining crumb should be
    // the current page (it wasn't necessarily flagged in the loop above).
    if (!itemKind && breadcrumbs.length > 1) {
      breadcrumbs[breadcrumbs.length - 1].isCurrentPage = true
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-7xl flex min-h-10 items-center py-2 px-4 lg:px-6">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {crumb.isCurrentPage ? (
                    <BreadcrumbPage className="text-foreground font-medium text-sm">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href} className="text-sm">
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}
