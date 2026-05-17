import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-tasting-templates')

type WineEntry = {
  libraryWine: number
  pourOrder?: number
  hostNotes?: string
}

type AccessLevel = 'free' | 'members_only'
type PublishedStatus = 'draft' | 'published'

type CreateBody = {
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

function validateBody(body: CreateBody): string | null {
  if (!body.title || body.title.trim() === '') return 'Titel saknas.'
  if (body.title.trim().length > 100) return 'Titel får vara max 100 tecken.'
  if (body.description && body.description.trim().length > 500)
    return 'Beskrivning får vara max 500 tecken.'
  if (body.slug && !/^[a-z0-9-]+$/.test(body.slug)) {
    return 'Slug får bara innehålla små bokstäver, siffror och bindestreck.'
  }
  const wines = body.wines || []
  // Wines optional for drafts; required when publishing
  if (body.publishedStatus === 'published' && wines.length < 1) {
    return 'Lägg till minst ett vin för att publicera.'
  }
  for (let i = 0; i < wines.length; i++) {
    const w = wines[i]
    if (typeof w.libraryWine !== 'number') {
      return `Vin ${i + 1}: välj ett vin från biblioteket.`
    }
  }
  return null
}

/**
 * POST /api/tasting-templates
 *
 * Create a new TastingTemplate. Admin-only — templates are curated content
 * shipped to the public library. Non-admin members and guests get 403/401.
 */
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const err = validateBody(body)
  if (err) {
    return NextResponse.json({ error: err }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const computedSlug =
    body.slug?.trim() ||
    body
      .title!.toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
  try {
    const created = await payload.create({
      collection: 'tasting-templates',
      data: {
        title: body.title!.trim(),
        slug: computedSlug,
        description: body.description?.trim() || undefined,
        targetParticipants: body.targetParticipants ?? 4,
        featuredImage: body.featuredImage ?? undefined,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        seoTitle: body.seoTitle?.trim() || undefined,
        seoDescription: body.seoDescription?.trim() || undefined,
        publishedStatus: body.publishedStatus ?? 'draft',
        accessLevel: body.accessLevel ?? 'free',
        hostScript: body.hostScript?.trim() || undefined,
        wines: (body.wines || []).map((w, idx) => ({
          libraryWine: w.libraryWine,
          pourOrder: w.pourOrder ?? idx + 1,
          hostNotes: w.hostNotes ?? '',
        })),
      },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ template: created }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to create tasting template', { userId: user.id, message })
    const isValidation = err instanceof Error && err.name === 'ValidationError'
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte skapa provningsmall.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}
