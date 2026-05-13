import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateCard } from '@/components/tasting-template/TemplateCard'
import type { TastingTemplate } from '@/payload-types'

export const metadata: Metadata = {
  title: 'Provningsmallar — Vinakademin',
  description:
    'Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen provning.',
}

export const dynamic = 'force-dynamic'

export default async function ProvningsmallarListing() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: { publishedStatus: { equals: 'published' } },
    sort: '-publishedAt',
    limit: 60,
    depth: 1,
  })
  const templates = docs as TastingTemplate[]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-heading">Provningsmallar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Färdiga provningsupplägg från Vinakademin. Klona en mall, anpassa, och starta din egen
          provning.
        </p>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
          Inga mallar än — kom tillbaka snart.
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
