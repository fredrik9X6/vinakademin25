'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import React from 'react'

interface SiteHeaderProps {
  title?: string
}

interface BreadcrumbItem {
  label: string
  href: string
  isCurrentPage: boolean
}

// Route config: section → { label, apiPath for slug resolution }
const ROUTE_CONFIG: Record<string, { label: string; titleApi?: string }> = {
  vinprovningar: { label: 'Vinprovningar', titleApi: '/api/vinprovningar/title' },
  kurser: { label: 'Vinprovningar', titleApi: '/api/vinprovningar/title' },
  artiklar: { label: 'Artiklar', titleApi: '/api/blog-posts/title' },
  vinlistan: { label: 'Vinlistan', titleApi: '/api/wines/title' },
  regioner: { label: 'Regioner', titleApi: '/api/regions/title' },
  lander: { label: 'Länder', titleApi: '/api/countries/title' },
  nyhetsbrev: { label: 'Nyhetsbrev' },
  'om-oss': { label: 'Om oss' },
  'mina-sidor': { label: 'Mina sidor' },
  profil: { label: 'Profil' },
  checkout: { label: 'Kassa' },
}

export function SiteHeader({ title: _title = 'Vinakademin' }: SiteHeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Resolved title for the detail page slug (e.g., the wine tasting name)
  const [resolvedTitle, setResolvedTitle] = React.useState<string | null>(null)

  // Fetch the real title for detail pages so breadcrumbs don't display a formatted slug
  React.useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const section = pathSegments[0]
    const slug = pathSegments[1]

    // Only fetch when on a detail page (section/slug) with a configured API
    const config = section ? ROUTE_CONFIG[section] : undefined
    if (!config?.titleApi || !slug || pathSegments.length !== 2) {
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
  }, [pathname, searchParams])

  // Format a slug into a display label (fallback when API title not yet loaded)
  const formatSlug = (slug: string) =>
    slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  // Generate breadcrumb items based on the current path
  const generateBreadcrumbs = () => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = []

    // Always start with home
    breadcrumbs.push({
      label: 'Hem',
      href: '/',
      isCurrentPage: pathname === '/' && !searchParams.get('lesson'),
    })

    // Build breadcrumbs from path segments
    let currentPath = ''
    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath += `/${segment}`
      const isLast = i === pathSegments.length - 1

      let label = segment

      // First segment: use route config label
      if (i === 0 && ROUTE_CONFIG[segment]) {
        label = ROUTE_CONFIG[segment].label
      }
      // Nested known labels
      else if (segment === 'kategori' && pathSegments[0] === 'artiklar') {
        label = 'Kategori'
      } else if (segment === 'tagg' && pathSegments[0] === 'artiklar') {
        label = 'Tagg'
      } else if (segment === 'success' && pathSegments[0] === 'checkout') {
        label = 'Betalning genomförd'
      }
      // Detail page slug (second segment): use resolved title or formatted slug
      else if (i === 1 && ROUTE_CONFIG[pathSegments[0]]) {
        label = isLast && resolvedTitle ? resolvedTitle : formatSlug(segment)
      }
      // Category/tag archive slugs
      else if (
        i === 2 &&
        pathSegments[0] === 'artiklar' &&
        (pathSegments[1] === 'kategori' || pathSegments[1] === 'tagg')
      ) {
        label = formatSlug(segment)
      }
      // Unknown segments: capitalize first letter
      else {
        label = segment.charAt(0).toUpperCase() + segment.slice(1)
      }

      const isCurrentPage = isLast && !searchParams.get('lesson')

      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrentPage,
      })
    }

    // Handle lesson parameter
    const lessonId = searchParams.get('lesson')
    if (
      lessonId &&
      (pathSegments[0] === 'kurser' || pathSegments[0] === 'vinprovningar') &&
      pathSegments[1]
    ) {
      breadcrumbs.push({
        label: `Lektion ${lessonId}`,
        href: `${pathname}?lesson=${lessonId}`,
        isCurrentPage: true,
      })
      // Update the course breadcrumb to not be current page
      if (breadcrumbs.length > 2) {
        breadcrumbs[breadcrumbs.length - 2].isCurrentPage = false
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-0 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.href}>
                <BreadcrumbItem>
                  {crumb.isCurrentPage ? (
                    <BreadcrumbPage className="text-foreground font-medium">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
