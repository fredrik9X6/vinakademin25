import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { verifySubmissionToken } from '@/lib/blindkamp/tokens'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-submit')

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) {
    return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })
  }
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token krävs' }, { status: 400 })

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { submissionToken: { equals: token } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) {
    return NextResponse.json({ error: 'Ogiltig länk' }, { status: 404 })
  }
  const submission = found.docs[0] as any

  // Constant-time verify (belt + suspenders — DB already filtered by token)
  if (!verifySubmissionToken(submission.submissionToken, token)) {
    return NextResponse.json({ error: 'Ogiltig token' }, { status: 401 })
  }

  // Block edits if battle is past submissions_open
  let battle: any
  try {
    battle = await payload.findByID({
      collection: 'blind-battles',
      id: battleId,
      overrideAccess: true,
    })
  } catch {
    return NextResponse.json({ error: 'Blindkampen finns inte' }, { status: 404 })
  }
  if (battle.status !== 'submissions_open') {
    return NextResponse.json({ error: 'Inlämningen är stängd' }, { status: 400 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    systembolagetProductNumber: string | null
    customWine: {
      name: string
      producer?: string
      vintage?: string
      priceSek?: number | null
      type?: string
    }
  }
  const customName = String(body.customWine?.name || '').trim()
  if (!body.systembolagetProductNumber && !customName) {
    return NextResponse.json({ error: 'Välj ett vin eller fyll i namn' }, { status: 400 })
  }

  let systembolagetProductId: number | null = null
  if (body.systembolagetProductNumber) {
    const sb = await payload.find({
      collection: 'systembolaget-products',
      where: { productNumber: { equals: body.systembolagetProductNumber } },
      limit: 1,
      overrideAccess: true,
    })
    systembolagetProductId = (sb.docs[0] as any)?.id ?? null
  }

  await payload.update({
    collection: 'blind-battle-submissions',
    id: submission.id,
    data: {
      systembolagetProduct: systembolagetProductId ?? null,
      customWine: body.systembolagetProductNumber
        ? undefined
        : {
            name: customName,
            producer: body.customWine.producer?.trim() || undefined,
            vintage: body.customWine.vintage?.trim() || undefined,
            type: body.customWine.type || undefined,
            priceSek: body.customWine.priceSek ?? undefined,
          },
      submittedAt: new Date().toISOString(),
      status: 'submitted',
    } as never,
    overrideAccess: true,
  })

  log.info({ battleId, submissionId: submission.id }, 'blind_battle_submission_made')
  return NextResponse.json({ ok: true })
}
