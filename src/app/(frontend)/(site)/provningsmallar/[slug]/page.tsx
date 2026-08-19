import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers } from 'next/headers'
import { TemplateDetailView } from '@/components/tasting-template/TemplateDetailView'
import { LockedTemplateDetailView } from '@/components/tasting-template/LockedTemplateDetailView'
import { getUser } from '@/lib/get-user'
import { getLockedTemplatePreview } from '@/lib/template-locked-preview'
import { canUseTemplate } from '@/lib/access-control'
import { getSiteURL } from '@/lib/site-url'
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
  if (!template) return { title: 'Vinprovning' }
  return {
    title: template.seoTitle || `${template.title} — Vinprovningar`,
    description:
      template.seoDescription ||
      template.description?.slice(0, 160) ||
      'En vinprovning från Vinakademin.',
    alternates: { canonical: `${getSiteURL()}/provningsmallar/${slug}` },
  }
}

export const dynamic = 'force-dynamic'

export default async function ProvningsmallDetailPage({ params }: RouteParams) {
  const { slug } = await params
  const template = await loadTemplate(slug)
  if (!template) notFound()

  const user = await getUser()
  const isAdmin = user?.role === 'admin'

  // Build a PayloadRequest-shaped object for canUseTemplate. getPayload here
  // is the same instance used by helpers, so subscription/entitlement lookups
  // share the same connection pool.
  const payload = await getPayload({ config })
  const req = {
    payload,
    headers: await headers(),
    user: user || null,
  } as unknown as Parameters<typeof canUseTemplate>[0]

  const hasAccess = await canUseTemplate(req, user, {
    id: template.id,
    accessLevel: (template as { accessLevel?: string }).accessLevel as 'free' | 'paid' | undefined,
  })

  if (!hasAccess) {
    const preview = getLockedTemplatePreview(template)
    // IMPORTANT: build a redacted template payload so the wines array (with
    // names, producers, hostNotes, etc.) is NEVER serialized into the page
    // HTML. Only the fields needed by the locked view survive.
    const redactedTemplate = {
      ...template,
      wines: [],
      hostScript: null,
    } as TastingTemplate
    return (
      <LockedTemplateDetailView
        template={redactedTemplate}
        preview={preview}
        isAuthenticated={!!user}
      />
    )
  }

  return <TemplateDetailView template={template} isAdmin={isAdmin} />
}
