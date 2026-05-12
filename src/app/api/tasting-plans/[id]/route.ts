import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-tasting-plans-id')

type CustomWine = {
  name?: string
  producer?: string
  vintage?: string
  type?: 'red' | 'white' | 'rose' | 'sparkling' | 'dessert' | 'fortified' | 'other'
  systembolagetUrl?: string
  priceSek?: number
}

type WineEntry = {
  libraryWine?: number
  customWine?: CustomWine
  pourOrder?: number
  hostNotes?: string
}

type PatchBody = {
  title?: string
  description?: string
  occasion?: string
  targetParticipants?: number
  wines?: WineEntry[]
  hostScript?: string
  status?: 'draft' | 'ready' | 'archived'
}

function validatePatch(body: PatchBody): string | null {
  if (body.title !== undefined) {
    if (!body.title || body.title.trim() === '') return 'Titel får inte vara tom.'
    if (body.title.trim().length > 100) return 'Titel får vara max 100 tecken.'
  }
  if (body.description && body.description.trim().length > 500)
    return 'Beskrivning får vara max 500 tecken.'
  if (body.wines !== undefined) {
    if (body.wines.length < 3) return 'En plan måste innehålla minst 3 viner.'
    for (let i = 0; i < body.wines.length; i++) {
      const w = body.wines[i]
      const hasLib = w.libraryWine != null
      const hasCustom = !!w.customWine?.name?.trim()
      if (hasLib && hasCustom) return `Vin ${i + 1}: välj antingen ett bibliotekvin ELLER ett eget vin — inte båda.`
      if (!hasLib && !hasCustom) return `Vin ${i + 1}: välj ett vin från biblioteket eller fyll i namn på eget vin.`
    }
  }
  return null
}

async function loadOwned(planId: number, userId: number, isAdmin: boolean, payload: any) {
  const plan = await payload.findByID({
    collection: 'tasting-plans',
    id: planId,
    overrideAccess: true,
  })
  if (!plan) return { plan: null, status: 404 as const, error: 'Tasting plan not found' }
  const ownerId = typeof plan.owner === 'object' ? plan.owner?.id : plan.owner
  if (!isAdmin && ownerId !== userId) {
    return { plan: null, status: 403 as const, error: 'Not your plan' }
  }
  return { plan, status: 200 as const, error: null }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }

  let body: PatchBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const err = validatePatch(body)
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const payload = await getPayload({ config })
  const isAdmin = user.role === 'admin'
  const guard = await loadOwned(planId, user.id, isAdmin, payload)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.description !== undefined) data.description = body.description.trim() || null
  if (body.occasion !== undefined) data.occasion = body.occasion.trim() || null
  if (body.targetParticipants !== undefined) data.targetParticipants = body.targetParticipants
  if (body.wines !== undefined) {
    data.wines = body.wines.map((w, idx) => ({
      libraryWine: w.libraryWine ?? null,
      customWine: w.customWine?.name?.trim() ? w.customWine : undefined,
      pourOrder: w.pourOrder ?? idx + 1,
      hostNotes: w.hostNotes ?? '',
    }))
  }
  if (body.hostScript !== undefined) data.hostScript = body.hostScript
  if (body.status !== undefined) data.status = body.status

  try {
    const updated = await payload.update({
      collection: 'tasting-plans',
      id: planId,
      data,
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ plan: updated })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    log.error('Failed to update tasting plan', { userId: user.id, planId, message })
    const isValidation = e instanceof Error && e.name === 'ValidationError'
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte uppdatera provningsplan.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const planId = Number(id)
  if (!Number.isInteger(planId)) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const isAdmin = user.role === 'admin'
  const guard = await loadOwned(planId, user.id, isAdmin, payload)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    if (guard.plan!.status !== 'archived') {
      const updated = await payload.update({
        collection: 'tasting-plans',
        id: planId,
        data: { status: 'archived' },
        overrideAccess: false,
        user,
      })
      return NextResponse.json({ plan: updated, archived: true })
    }

    await payload.delete({
      collection: 'tasting-plans',
      id: planId,
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ deleted: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    log.error('Failed to delete tasting plan', { userId: user.id, planId, message })
    return NextResponse.json(
      { error: 'Kunde inte ta bort provningsplan.' },
      { status: 500 },
    )
  }
}
