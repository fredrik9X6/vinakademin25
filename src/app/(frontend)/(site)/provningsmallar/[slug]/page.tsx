import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateDetailView } from '@/components/tasting-template/TemplateDetailView'
import type { TastingTemplate } from '@/payload-types'

interface RouteParams {
  params: Promise<{ slug: string }>
}

async function loadTemplate(slug: string): Promise<TastingTemplate | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: {
      and: [
        { slug: { equals: slug } },
        { publishedStatus: { equals: 'published' } },
      ],
    },
    depth: 2,
    limit: 1,
  })
  return (docs[0] as TastingTemplate) ?? null
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params
  const template = await loadTemplate(slug)
  if (!template) return { title: 'Provningsmall — Vinakademin' }
  return {
    title: template.seoTitle || `${template.title} — Provningsmallar | Vinakademin`,
    description:
      template.seoDescription ||
      template.description?.slice(0, 160) ||
      'En provningsmall från Vinakademin.',
  }
}

export const dynamic = 'force-dynamic'

export default async function ProvningsmallDetailPage({ params }: RouteParams) {
  const { slug } = await params
  const template = await loadTemplate(slug)
  if (!template) notFound()
  return <TemplateDetailView template={template} />
}
