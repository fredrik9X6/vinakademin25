import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-reveal')

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const battleId = parseInt(id, 10)
  if (Number.isNaN(battleId)) return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })

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
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId !== user.id) return NextResponse.json({ error: 'Endast värden' }, { status: 403 })
  if (battle.status !== 'in_session') {
    return NextResponse.json({ error: 'Provningen är inte aktiv' }, { status: 400 })
  }

  // Stamp revealedAt on every submission
  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { battle: { equals: battleId } },
    limit: 100,
    overrideAccess: true,
  })
  const now = new Date().toISOString()
  for (const s of subs.docs as any[]) {
    await payload.update({
      collection: 'blind-battle-submissions',
      id: s.id,
      data: { revealedAt: now } as never,
      overrideAccess: true,
    })
  }

  await payload.update({
    collection: 'blind-battles',
    id: battleId,
    data: { status: 'completed' } as never,
    overrideAccess: true,
  })

  log.info({ battleId }, 'blind_battle_revealed')
  return NextResponse.json({ ok: true })
}
