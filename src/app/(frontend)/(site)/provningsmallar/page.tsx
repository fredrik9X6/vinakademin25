import type { Metadata } from 'next'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { TagFilter, type TagCount } from '@/components/tasting-template/TagFilter'
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
  searchParams: Promise<{ tag?: string; access?: string }>
}) {
  const sp = await searchParams
  const activeTag = (sp.tag || '').trim() || null
  const accessFilter: AccessFilter =
    sp.access === 'free' || sp.access === 'members_only' ? sp.access : null

  const payload = await getPayload({ config })

  // Listing query (filtered by tag + access level if active)
  const whereAnd: any[] = [{ publishedStatus: { equals: 'published' } }]
  if (activeTag) {
    whereAnd.push({ tags: { contains: activeTag } })
  }
  if (accessFilter) {
    whereAnd.push({ accessLevel: { equals: accessFilter } })
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
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Provningsmallar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen
          provning.
        </p>
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
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  )
}
