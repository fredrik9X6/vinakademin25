import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { TagFilter, type TagCount } from '@/components/tasting-template/TagFilter'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getUser } from '@/lib/get-user'
import { cn } from '@/lib/utils'
import type { TastingTemplate } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Provningsmallar — Vinakademin',
  description:
    'Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen provning.',
}

export const dynamic = 'force-dynamic'

type AccessFilter = 'free' | 'members_only' | null

export default async function ProvningsmallarListing({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; access?: string; status?: string }>
}) {
  const sp = await searchParams
  const activeTag = (sp.tag || '').trim() || null
  const accessFilter: AccessFilter =
    sp.access === 'free' || sp.access === 'members_only' ? sp.access : null

  const user = await getUser()
  const isAdmin = user?.role === 'admin'
  // Admin-only: ?status=draft flips the listing to show utkast instead of
  // published. Non-admins always see published — query silently ignored.
  const showDrafts = isAdmin && sp.status === 'draft'

  const payload = await getPayload({ config })

  // Listing query (filtered by tag + access level if active)
  const whereAnd: any[] = [
    { publishedStatus: { equals: showDrafts ? 'draft' : 'published' } },
  ]
  if (activeTag) {
    whereAnd.push({ tags: { contains: activeTag } })
  }
  if (accessFilter) {
    whereAnd.push({ accessLevel: { equals: accessFilter } })
  }

  // Draft count for the admin pill — query separately so we can render it
  // even when the user isn't viewing the drafts list.
  let draftCount = 0
  if (isAdmin) {
    const draftsRes = await payload.find({
      collection: 'tasting-templates',
      where: { publishedStatus: { equals: 'draft' } } as any,
      limit: 0,
      depth: 0,
    })
    draftCount = draftsRes.totalDocs
  }
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: { and: whereAnd } as any,
    sort: '-publishedAt',
    limit: 60,
    depth: 1,
  })
  const templates = docs as TastingTemplate[]

  // Tag-counts union (separate query so the filter chips don't disappear when a tag is active)
  const allRes = await payload.find({
    collection: 'tasting-templates',
    where: { publishedStatus: { equals: 'published' } },
    limit: 200,
    depth: 0,
  })
  const tagMap = new Map<string, number>()
  for (const t of allRes.docs as TastingTemplate[]) {
    const arr = (t as any).tags as string[] | undefined
    if (!Array.isArray(arr)) continue
    for (const tag of arr) {
      const norm = String(tag).trim()
      if (!norm) continue
      tagMap.set(norm, (tagMap.get(norm) ?? 0) + 1)
    }
  }
  const tagCounts: TagCount[] = Array.from(tagMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)

  function pillHref(next: AccessFilter): string {
    const params = new URLSearchParams()
    if (activeTag) params.set('tag', activeTag)
    if (next) params.set('access', next)
    if (showDrafts) params.set('status', 'draft')
    const qs = params.toString()
    return qs ? `/provningsmallar?${qs}` : '/provningsmallar'
  }
  function statusHref(next: 'draft' | null): string {
    const params = new URLSearchParams()
    if (activeTag) params.set('tag', activeTag)
    if (accessFilter) params.set('access', accessFilter)
    if (next) params.set('status', next)
    const qs = params.toString()
    return qs ? `/provningsmallar?${qs}` : '/provningsmallar'
  }

  const pills: Array<{ key: string; label: string; href: string; active: boolean }> = [
    {
      key: 'all',
      label: 'Alla',
      href: pillHref(null),
      active: accessFilter == null,
    },
    {
      key: 'free',
      label: 'Fri',
      href: pillHref('free'),
      active: accessFilter === 'free',
    },
    {
      key: 'members_only',
      label: 'Medlem',
      href: pillHref('members_only'),
      active: accessFilter === 'members_only',
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading">
            {showDrafts ? 'Utkast' : 'Provningsmallar'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {showDrafts
              ? 'Mallar du har sparat som utkast. Bara du som admin ser dessa.'
              : 'Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen provning.'}
          </p>
        </div>
        {isAdmin && (
          <Button asChild size="sm" className="flex-shrink-0">
            <Link href="/provningsmallar/ny">
              <Plus className="h-4 w-4 mr-1" />
              Skapa ny mall
            </Link>
          </Button>
        )}
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {pills.map((p) => (
          <Link
            key={p.key}
            href={p.href}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors',
              p.active
                ? 'border-brand-400 bg-brand-400 text-white'
                : 'border-border bg-card hover:bg-muted/40',
            )}
          >
            {p.label}
          </Link>
        ))}
        {isAdmin && (
          <>
            <span aria-hidden className="mx-1 h-5 w-px self-center bg-border" />
            {showDrafts ? (
              <Link
                href={statusHref(null)}
                className="inline-flex items-center rounded-full border border-border bg-card hover:bg-muted/40 px-3 py-1 text-xs transition-colors"
              >
                Visa publicerade
              </Link>
            ) : (
              <Link
                href={statusHref('draft')}
                className="inline-flex items-center rounded-full border border-amber-400/60 bg-amber-100/40 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 px-3 py-1 text-xs transition-colors hover:bg-amber-100/70"
              >
                Visa utkast ({draftCount})
              </Link>
            )}
          </>
        )}
      </div>

      <TagFilter tags={tagCounts} activeTag={activeTag} />

      {templates.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {activeTag || accessFilter
            ? 'Inga mallar matchar filtret.'
            : 'Inga mallar än — kom tillbaka snart.'}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              href={showDrafts ? `/provningsmallar/redigera/${t.id}` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
