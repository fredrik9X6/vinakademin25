import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'
import type { TastingPlan } from '@/payload-types'

const log = loggerFor('api-tasting-plans-duplicate')

/**
 * POST /api/tasting-plans/[id]/duplicate
 *
 * Auth required. Clones an owned (or admin-accessible) TastingPlan into a
 * fresh draft for the authenticated user. The clone copies wines (incl.
 * customWine snapshots), settings, and notes — but resets to draft status,
 * un-publishes from the profile, and appends "(kopia)" to the title.
 */
export async function POST(
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

  let source: TastingPlan | null = null
  try {
    source = (await payload.findByID({
      collection: 'tasting-plans',
      id: planId,
      depth: 1,
      overrideAccess: true,
    })) as TastingPlan
  } catch {
    source = null
  }
  if (!source) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }
  const ownerId = typeof source.owner === 'object' ? source.owner?.id : source.owner
  if (user.role !== 'admin' && ownerId !== user.id) {
    return NextResponse.json({ error: 'Not your plan' }, { status: 403 })
  }

  const wines = (source.wines ?? []).map((w, idx) => ({
    libraryWine:
      typeof w.libraryWine === 'object' && w.libraryWine
        ? w.libraryWine.id
        : (w.libraryWine as number | null) ?? null,
    customWine: w.customWine?.name
      ? {
          name: w.customWine.name,
          producer: w.customWine.producer ?? undefined,
          vintage: w.customWine.vintage ?? undefined,
          type: w.customWine.type ?? undefined,
          systembolagetUrl: w.customWine.systembolagetUrl ?? undefined,
          priceSek: w.customWine.priceSek ?? undefined,
          systembolagetProductNumber:
            w.customWine.systembolagetProductNumber ?? undefined,
          imageUrl: w.customWine.imageUrl ?? undefined,
        }
      : undefined,
    pourOrder: w.pourOrder ?? idx + 1,
    hostNotes: w.hostNotes ?? '',
  }))

  const titleBase = source.title.replace(/\s*\(kopia\)$/i, '').trim()
  const clonedTitle = `${titleBase} (kopia)`.slice(0, 100)

  try {
    const created = await payload.create({
      collection: 'tasting-plans',
      data: {
        owner: user.id,
        title: clonedTitle,
        description: source.description || undefined,
        targetParticipants: source.targetParticipants ?? 4,
        blindTastingByDefault: source.blindTastingByDefault ?? false,
        defaultMinutesPerWine: source.defaultMinutesPerWine ?? null,
        // Clone starts unpublished — host can re-publish once happy with it.
        publishedToProfile: false,
        wines,
        hostScript: source.hostScript || undefined,
        status: 'draft',
      },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ plan: created }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to duplicate plan', { userId: user.id, planId, message })
    const isValidation = err instanceof Error && err.name === 'ValidationError'
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte kopiera planen.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}
