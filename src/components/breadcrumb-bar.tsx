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
import { buildBreadcrumbTrail, TITLE_APIS } from '@/lib/breadcrumb-trail'

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

  const breadcrumbs = buildBreadcrumbTrail({
    pathname,
    resolvedTitle,
    resolvedItemTitle,
    itemKind,
    itemId,
  })

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
