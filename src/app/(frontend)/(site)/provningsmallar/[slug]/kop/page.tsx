import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { canUseTemplate } from '@/lib/access-control'
import { TemplateBuyConfirmation } from '@/components/tasting-template/TemplateBuyConfirmation'
import type { TastingTemplate, Media } from '@/payload-types'

interface RouteParams {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Köp vinprovning — Vinakademin',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function TemplateBuyPage({ params }: RouteParams) {
  const { slug } = await params

  const user = await getUser()
  if (!user) {
    redirect(`/logga-in?next=/provningsmallar/${slug}/kop`)
  }

  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'tasting-templates',
    where: {
      and: [{ slug: { equals: slug } }, { publishedStatus: { equals: 'published' } }],
    },
    depth: 1,
    limit: 1,
  })
  const template = (docs[0] as TastingTemplate) ?? null
  if (!template) notFound()

  // If access is already granted (subscriber, prior purchase, free trial),
  // bounce to the detail page — no need to re-buy.
  const req = {
    payload,
    headers: await headers(),
    user,
  } as unknown as Parameters<typeof canUseTemplate>[0]

  const hasAccess = await canUseTemplate(req, user, {
    id: template.id,
    accessLevel: (template as { accessLevel?: string }).accessLevel as 'free' | 'paid' | undefined,
    isFreeTrial: (template as { isFreeTrial?: boolean }).isFreeTrial,
  })

  if (hasAccess) {
    redirect(`/provningsmallar/${slug}`)
  }

  if ((template as { accessLevel?: string }).accessLevel !== 'paid') {
    redirect(`/provningsmallar/${slug}`)
  }

  const priceSek = (template as { priceSek?: number }).priceSek || 99
  const featured =
    typeof template.featuredImage === 'object' && template.featuredImage
      ? (template.featuredImage as Media)
      : null

  return (
    <TemplateBuyConfirmation
      templateId={template.id}
      title={template.title}
      description={template.description || null}
      priceSek={priceSek}
      heroUrl={featured?.url || null}
      slug={slug}
    />
  )
}
