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

// Route config: section -> { label, apiPath for slug resolution }
const ROUTE_CONFIG: Record<string, { label: string; titleApi?: string }> = {
  vinprovningar: { label: 'Vinprovningar', titleApi: '/api/vinprovningar/title' },
  kurser: { label: 'Vinprovningar', titleApi: '/api/vinprovningar/title' },
  artiklar: { label: 'Artiklar', titleApi: '/api/blog-posts/title' },
  vinlistan: { label: 'Vinlistan', titleApi: '/api/wines/title' },
  regioner: { label: 'Regioner', titleApi: '/api/regions/title' },
  lander: { label: 'Lander', titleApi: '/api/countries/title' },
  nyhetsbrev: { label: 'Nyhetsbrev' },
  'om-oss': { label: 'Om oss' },
  'mina-provningar': { label: 'Mina Provningar' },
  profil: { label: 'Profil' },
  checkout: { label: 'Kassa' },
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
  // IMPORTANT: This hook must always run (React rules of hooks) — the
  // homepage early-return is handled AFTER all hooks.
  React.useEffect(() => {
    if (isHomepage) {
      setResolvedTitle(null)
      return
    }

    const pathSegments = pathname.split('/').filter(Boolean)
    const section = pathSegments[0]
    const slug = pathSegments[1]

    const config = section ? ROUTE_CONFIG[section] : undefined
    // Resolve course/post title for /section/slug and nested routes like /vinprovningar/slug/recension
    if (!config?.titleApi || !slug) {
      setResolvedTitle(null)
      return
    }

    const controller = new AbortController()

    const fetchTitle = async () => {
      try {
        const url = new URL(config.titleApi!, window.location.origin)
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
    }

    fetchTitle()
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

  // Format a slug into a display label
  const formatSlug = (slug: string) =>
    slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

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
      const isLast = i === pathSegments.length - 1

      let label = segment

      if (i === 0 && ROUTE_CONFIG[segment]) {
        label = ROUTE_CONFIG[segment].label
      } else if (segment === 'kategori' && pathSegments[0] === 'artiklar') {
        label = 'Kategori'
      } else if (segment === 'tagg' && pathSegments[0] === 'artiklar') {
        label = 'Tagg'
      } else if (segment === 'success' && pathSegments[0] === 'checkout') {
        label = 'Betalning genomford'
      } else if (i === 1 && ROUTE_CONFIG[pathSegments[0]]) {
        label = resolvedTitle ?? formatSlug(segment)
      } else if (
        i === 2 &&
        pathSegments[0] === 'artiklar' &&
        (pathSegments[1] === 'kategori' || pathSegments[1] === 'tagg')
      ) {
        label = formatSlug(segment)
      } else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1)
      }

      const isCurrentPage = isLast && !itemKind

      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrentPage,
      })
    }

    // Append the active lesson / quiz inside the course viewer.
    if (
      itemKind &&
      itemId &&
      (pathSegments[0] === 'kurser' || pathSegments[0] === 'vinprovningar') &&
      pathSegments[1]
    ) {
      // Prefer the resolved content-item title; fall back to a numeric label
      // until it loads (avoids a flash of "undefined").
      const fallback = itemKind === 'quiz' ? `Quiz ${itemId}` : `Lektion ${itemId}`
      breadcrumbs.push({
        label: resolvedItemTitle ?? fallback,
        href: `${pathname}?${itemKind}=${itemId}`,
        isCurrentPage: true,
      })
      if (breadcrumbs.length > 2) {
        breadcrumbs[breadcrumbs.length - 2].isCurrentPage = false
      }
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
