import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { TemplateDetailView } from '@/components/tasting-template/TemplateDetailView'
import { LockedTemplateDetailView } from '@/components/tasting-template/LockedTemplateDetailView'
import { getUser } from '@/lib/get-user'
import { viewerIsMember } from '@/lib/membership'
import { getLockedTemplatePreview } from '@/lib/template-locked-preview'
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

  const user = await getUser()
  const isLocked =
    (template as { accessLevel?: string }).accessLevel === 'members_only' &&
    !viewerIsMember(user)

  if (isLocked) {
    const preview = getLockedTemplatePreview(template)
    // IMPORTANT: build a redacted template payload so the wines array (with
    // names, producers, hostNotes, etc.) is NEVER serialized into the page
    // HTML. Only the fields needed by the locked view survive.
    const redactedTemplate = {
      ...template,
      wines: [],
      hostScript: null,
    } as TastingTemplate
    return <LockedTemplateDetailView template={redactedTemplate} preview={preview} />
  }

  return <TemplateDetailView template={template} />
}
