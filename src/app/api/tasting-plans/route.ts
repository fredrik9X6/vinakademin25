import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-tasting-plans')

type CustomWine = {
  name?: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
  systembolagetProductNumber?: string
  imageUrl?: string
}

type WineEntry = {
  libraryWine?: number
  customWine?: CustomWine
  pourOrder?: number
  hostNotes?: string
}

type CreateBody = {
  title?: string
  description?: string
  occasion?: string
  targetParticipants?: number
  wines?: WineEntry[]
  hostScript?: string
}

function validateBody(body: CreateBody): string | null {
  if (!body.title || body.title.trim() === '') return 'Titel saknas.'
  if (body.title.trim().length > 100) return 'Titel får vara max 100 tecken.'
  if (body.description && body.description.trim().length > 500)
    return 'Beskrivning får vara max 500 tecken.'
  const wines = body.wines || []
  if (wines.length < 1) return 'Lägg till minst ett vin.'
  for (let i = 0; i < wines.length; i++) {
    const w = wines[i]
    const hasLib = w.libraryWine != null
    const hasCustom = !!w.customWine?.name?.trim()
    if (hasLib && hasCustom)
      return `Vin ${i + 1}: välj antingen ett bibliotekvin ELLER ett eget vin — inte båda.`
    if (!hasLib && !hasCustom)
      return `Vin ${i + 1}: välj ett vin från biblioteket eller fyll i namn på eget vin.`
  }
  return null
}

export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  try {
    const created = await payload.create({
      collection: 'tasting-plans',
      data: {
        owner: user.id,
        title: body.title!.trim(),
        description: body.description?.trim() || undefined,
        occasion: body.occasion?.trim() || undefined,
        targetParticipants: body.targetParticipants ?? 4,
        wines: (body.wines || []).map((w, idx) => ({
          libraryWine: w.libraryWine ?? null,
          customWine: w.customWine?.name?.trim() ? w.customWine : undefined,
          pourOrder: w.pourOrder ?? idx + 1,
          hostNotes: w.hostNotes ?? '',
        })),
        hostScript: body.hostScript ?? undefined,
        status: 'draft',
      },
      overrideAccess: false,
      user,
    })

    return NextResponse.json({ plan: created }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to create tasting plan', { userId: user.id, message })
    // Payload throws ValidationError when collection-level hooks reject the data.
    const isValidation =
      err instanceof Error && err.name === 'ValidationError'
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte skapa provningsplan.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}
