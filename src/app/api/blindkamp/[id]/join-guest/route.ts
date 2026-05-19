import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { generateSubmissionToken } from '@/lib/blindkamp/tokens'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })
  const { inviteCode, name, email } = (await req.json().catch(() => ({}))) as {
    inviteCode?: string
    name?: string
    email?: string
  }
  if (!inviteCode || !name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Namn + e-post krävs' }, { status: 400 })
  }

  const payload = await getPayloadClient()
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
  if (battle.inviteCode !== inviteCode) {
    return NextResponse.json({ error: 'Ogiltig kod' }, { status: 404 })
  }
  if (battle.status !== 'submissions_open') {
    return NextResponse.json({ error: 'Inlämningen är stängd' }, { status: 400 })
  }

  const lowered = email.trim().toLowerCase()
  const existing = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { guestEmail: { equals: lowered } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length > 0) {
    return NextResponse.json({ token: (existing.docs[0] as any).submissionToken })
  }

  const token = generateSubmissionToken(battleId, lowered)
  await payload.create({
    collection: 'blind-battle-submissions',
    data: {
      battle: battleId,
      guestEmail: lowered,
      guestName: name.trim(),
      status: 'invited',
      submissionToken: token,
    } as never,
    overrideAccess: true,
  })
  return NextResponse.json({ token })
}
