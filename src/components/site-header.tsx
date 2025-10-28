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
        label = 'Kurser'
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
      } else if (segment === 'profil') {
        label = 'Profil'
      } else if (i === 1 && pathSegments[0] === 'kurser') {
        // This is a course slug - format it nicely
        label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      } else if (i === 1 && pathSegments[0] === 'artiklar') {
        // For direct article slugs, format them nicely
        label = segment
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
