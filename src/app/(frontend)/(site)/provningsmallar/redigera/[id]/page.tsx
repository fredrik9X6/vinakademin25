import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { TemplateForm } from '@/components/tasting-template/TemplateForm'
import type { TastingTemplate } from '@/payload-types'

interface RouteParams {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Redigera provningsmall — Vinakademin',
}

export default async function EditTemplatePage({ params }: RouteParams) {
  const { id } = await params
  const templateId = Number(id)
  if (!Number.isInteger(templateId)) notFound()

  const user = await getUser()
  if (!user) {
    redirect(`/logga-in?from=/provningsmallar/redigera/${id}`)
  }
  if (user.role !== 'admin') notFound()

  const payload = await getPayload({ config })
  let template: TastingTemplate | null = null
  try {
    template = (await payload.findByID({
      collection: 'tasting-templates',
      id: templateId,
      depth: 2,
      overrideAccess: true,
    })) as TastingTemplate
  } catch {
    template = null
  }
  if (!template) notFound()

  return <TemplateForm initialTemplate={template} />
}
