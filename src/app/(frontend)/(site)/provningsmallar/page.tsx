import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import { TagFilter, type TagCount } from '@/components/tasting-template/TagFilter'
import type { TastingTemplate } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Provningsmallar — Vinakademin',
  description:
    'Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen provning.',
}

export const dynamic = 'force-dynamic'

export default async function ProvningsmallarListing({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const sp = await searchParams
  const activeTag = (sp.tag || '').trim() || null

  const payload = await getPayload({ config })

  // Listing query (filtered by tag if active)
  const whereAnd: any[] = [{ publishedStatus: { equals: 'published' } }]
  if (activeTag) {
    whereAnd.push({ tags: { contains: activeTag } })
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Provningsmallar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen
          provning.
        </p>
      </header>

      <TagFilter tags={tagCounts} activeTag={activeTag} />

      {templates.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          {activeTag ? 'Inga mallar med den taggen.' : 'Inga mallar än — kom tillbaka snart.'}
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
