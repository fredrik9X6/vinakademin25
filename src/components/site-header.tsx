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

export function SiteHeader({ title: _title = 'Vinakademin' }: SiteHeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [articleTitle, setArticleTitle] = React.useState<string | null>(null)

  // Fetch the real blog post title for /artiklar/[slug] so breadcrumbs don't
  // display a reconstructed slug.
  React.useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    const isDirectBlogPost =
      pathSegments[0] === 'artiklar' && pathSegments.length === 2 && pathSegments[1]

    if (!isDirectBlogPost) {
      setArticleTitle(null)
      return
    }

    const slug = pathSegments[1]
    const controller = new AbortController()

    const fetchTitle = async () => {
      try {
        const url = new URL('/api/payload/blog-posts', window.location.origin)
        url.searchParams.set('where[slug][equals]', slug)
        url.searchParams.set('limit', '1')
        url.searchParams.set('depth', '0')

        // Support Payload draft preview (admin-only)
        if (searchParams.get('preview') === 'true') {
          url.searchParams.set('draft', 'true')
        }

        const res = await fetch(url.toString(), {
          credentials: 'include',
          signal: controller.signal,
        })
        if (!res.ok) {
          setArticleTitle(null)
          return
        }
        const json = (await res.json().catch(() => null)) as any
        const title = json?.docs?.[0]?.title
        setArticleTitle(typeof title === 'string' && title.trim() ? title : null)
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return
        setArticleTitle(null)
      }
    }

    fetchTitle()
    return () => controller.abort()
  }, [pathname, searchParams])

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

      // Custom labels for known routes
      let label = segment
      if (segment === 'kurser') {
        label = 'Vinprovningar' // Legacy URL support
      } else if (segment === 'nyhetsbrev') {
        label = 'Nyhetsbrev'
      } else if (segment === 'artiklar') {
        label = 'Artiklar'
      } else if (segment === 'vinlistan') {
        label = 'Vinlistan'
      } else if (segment === 'om-oss') {
        label = 'Om oss'
      } else if (segment === 'kategori' && pathSegments[0] === 'artiklar') {
        label = 'Kategori'
      } else if (segment === 'tagg' && pathSegments[0] === 'artiklar') {
        label = 'Tagg'
      } else if (segment === 'mina-sidor') {
        label = 'Mina sidor'
      } else if (segment === 'vinprovningar') {
        label = 'Vinprovningar'
      } else if (segment === 'profil') {
        label = 'Profil'
      } else if (segment === 'checkout') {
        label = 'Kassa'
      } else if (segment === 'success' && pathSegments[0] === 'checkout') {
        label = 'Betalning genomförd'
      } else if (i === 1 && pathSegments[0] === 'kurser') {
        // This is a wine tasting slug (legacy URL) - format it nicely
        label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else if (i === 1 && pathSegments[0] === 'vinprovningar') {
        // This is a wine tasting slug - format it nicely
        label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else if (i === 1 && pathSegments[0] === 'artiklar') {
        // For direct article slugs, format them nicely
        label =
          isLast && articleTitle
            ? articleTitle
            : segment
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
      } else if (i === 1 && pathSegments[0] === 'vinlistan') {
        // This is a wine slug - format it nicely by replacing dashes with spaces and capitalizing
        label = segment
          .replace(/-/g, ' ')
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else if (
        i === 2 &&
        pathSegments[0] === 'artiklar' &&
        (pathSegments[1] === 'kategori' || pathSegments[1] === 'tagg')
      ) {
        // For category/tag archive pages, format the slug nicely
        label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else {
        // Capitalize first letter for unknown segments
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
    if (lessonId && pathSegments[0] === 'kurser' && pathSegments[1]) {
      breadcrumbs.push({
        label: `Lektion ${lessonId}`,
        href: `${pathname}?lesson=${lessonId}`,
        isCurrentPage: true,
      })
      // Update the course breadcrumb to not be current page
      if (breadcrumbs.length > 2) {
        breadcrumbs[breadcrumbs.length - 2].isCurrentPage = false
      }
    } else if (lessonId && pathSegments[0] === 'vinprovningar' && pathSegments[1]) {
      breadcrumbs.push({
        label: `Lektion ${lessonId}`,
        href: `${pathname}?lesson=${lessonId}`,
        isCurrentPage: true,
      })
      // Update the wine tasting breadcrumb to not be current page
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
