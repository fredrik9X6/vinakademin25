import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'
import { mapTemplateWineEntry, type TemplateWineEntry } from '../wine-entry'

const log = loggerFor('api-tasting-templates-id')

type WineEntry = TemplateWineEntry

type AccessLevel = 'free' | 'paid'
type PublishedStatus = 'draft' | 'published'

type PatchBody = {
  title?: string
  slug?: string
  description?: string
  targetParticipants?: number
  featuredImage?: number | null
  tags?: string[]
  seoTitle?: string
  seoDescription?: string
  publishedStatus?: PublishedStatus
  accessLevel?: AccessLevel
  hostScript?: string
  wines?: WineEntry[]
}

/**
 * PATCH /api/tasting-templates/[id]
 *
 * Update an existing TastingTemplate. Admin-only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const templateId = Number(id)
  if (!Number.isInteger(templateId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.title !== undefined && body.title.trim() === '') {
    return NextResponse.json({ error: 'Titel saknas.' }, { status: 400 })
  }
  if (body.title && body.title.trim().length > 100) {
    return NextResponse.json({ error: 'Titel får vara max 100 tecken.' }, { status: 400 })
  }
  if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
    return NextResponse.json(
      { error: 'Slug får bara innehålla små bokstäver, siffror och bindestreck.' },
      { status: 400 },
    )
  }
  // When publishing, require at least one wine
  if (body.publishedStatus === 'published' && body.wines !== undefined && body.wines.length === 0) {
    return NextResponse.json(
      { error: 'Lägg till minst ett vin för att publicera.' },
      { status: 400 },
    )
  }

  const payload = await getPayload({ config })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.slug !== undefined) data.slug = body.slug.trim() || null
  if (body.description !== undefined) data.description = body.description.trim() || null
  if (body.targetParticipants !== undefined) data.targetParticipants = body.targetParticipants
  if (body.featuredImage !== undefined) data.featuredImage = body.featuredImage ?? null
  if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags : []
  if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle.trim() || null
  if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription.trim() || null
  if (body.publishedStatus !== undefined) data.publishedStatus = body.publishedStatus
  if (body.accessLevel !== undefined) data.accessLevel = body.accessLevel
  if (body.hostScript !== undefined) data.hostScript = body.hostScript.trim() || null
  if (body.wines !== undefined) {
    data.wines = body.wines.map(mapTemplateWineEntry)
  }

  try {
    const updated = await payload.update({
      collection: 'tasting-templates',
      id: templateId,
      data,
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ template: updated })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to update tasting template', { userId: user.id, templateId, message })
    const isValidation = err instanceof Error && err.name === 'ValidationError'
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte spara provningsmall.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}
