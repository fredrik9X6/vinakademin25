import { NextRequest, NextResponse } from 'next/server'
import { getPayload, ValidationError } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'
import type { TastingTemplate } from '@/payload-types'

const log = loggerFor('api-tasting-plans-from-template')

/**
 * POST /api/tasting-plans/from-template/[templateId]
 *
 * Auth required. Clones a published TastingTemplate into a new TastingPlan
 * owned by the authenticated user. Returns the new plan in { plan } shape.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { templateId } = await params
  const tplId = Number(templateId)
  if (!Number.isInteger(tplId)) {
    return NextResponse.json({ error: 'Invalid template id' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  // Read via the collection's access rules — drafts are hidden from non-admins.
  let template: TastingTemplate | null = null
  try {
    template = (await payload.findByID({
      collection: 'tasting-templates',
      id: tplId,
      depth: 1,
      overrideAccess: false,
      user,
    })) as TastingTemplate
  } catch {
    template = null
  }

  // Non-admins can only clone published templates. Admins can clone drafts too
  // (useful for previewing before publish).
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }
  if (template.publishedStatus !== 'published' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Clone each wine faithfully. Templates are almost always built from
  // Systembolaget snapshots (customWine, no libraryWine), so dropping customWine
  // here left every cloned wine with neither a library wine nor a custom wine —
  // which the plan's `wines` validator rejects, failing the whole create and
  // making "Använd mallen" 500 for every published template. Carry both through;
  // the template's own validator guarantees exactly one of them is set per wine.
  const wines = (template.wines ?? []).map((w, idx) => {
    const libraryWine =
      typeof w.libraryWine === 'object' && w.libraryWine
        ? w.libraryWine.id
        : (w.libraryWine as number | null)
    const cw = w.customWine
    const customWine =
      cw && cw.name && cw.name.trim() !== ''
        ? {
            name: cw.name,
            producer: cw.producer ?? undefined,
            vintage: cw.vintage ?? undefined,
            type: cw.type ?? undefined,
            systembolagetUrl: cw.systembolagetUrl ?? undefined,
            priceSek: cw.priceSek ?? undefined,
            systembolagetProductNumber: cw.systembolagetProductNumber ?? undefined,
            imageUrl: cw.imageUrl ?? undefined,
          }
        : undefined
    return {
      libraryWine: libraryWine ?? null,
      ...(customWine ? { customWine } : {}),
      pourOrder: w.pourOrder ?? idx + 1,
      hostNotes: w.hostNotes ?? '',
    }
  })

  try {
    const created = await payload.create({
      collection: 'tasting-plans',
      data: {
        owner: user.id,
        title: template.title,
        description: template.description || undefined,
        targetParticipants: template.targetParticipants ?? 4,
        wines,
        hostScript: template.hostScript || undefined,
        status: 'draft',
        derivedFromTemplate: template.id,
      },
      overrideAccess: false,
      user,
    })
    return NextResponse.json({ plan: created }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Failed to clone template', { userId: user.id, templateId: tplId, message })
    // Detect validation failures by prototype, not by name. Minification mangles
    // `err.name` in the production build, so the old `err.name === 'ValidationError'`
    // check fell through to a misleading generic 500 instead of surfacing the
    // real field error with a 400.
    const isValidation = err instanceof ValidationError
    return NextResponse.json(
      { error: isValidation ? message : 'Kunde inte skapa plan från mallen.' },
      { status: isValidation ? 400 : 500 },
    )
  }
}
