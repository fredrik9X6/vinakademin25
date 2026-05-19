import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'

async function isAdminOrOwner(
  payload: any,
  clubId: number,
  userId: number | string,
): Promise<boolean> {
  let club: any
  try {
    club = await payload.findByID({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  } catch {
    return false
  }
  return (
    (club.members ?? []).some((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      return uid === userId && (m.role === 'owner' || m.role === 'admin')
    }) ?? false
  )
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const clubId = parseInt(id, 10)
  if (Number.isNaN(clubId)) return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })
  const payload = await getPayloadClient()
  if (!(await isAdminOrOwner(payload, clubId, user.id))) {
    return NextResponse.json({ error: 'Saknar rättigheter' }, { status: 403 })
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const allowed = ['name', 'description', 'coverImage'] as const
  const data: Record<string, unknown> = {}
  for (const k of allowed) if (k in body) data[k] = body[k]
  await payload.update({ collection: 'wine-clubs', id: clubId, data: data as never, overrideAccess: true })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const clubId = parseInt(id, 10)
  if (Number.isNaN(clubId)) return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })
  const payload = await getPayloadClient()
  let club: any
  try {
    club = await payload.findByID({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'Klubben finns inte' }, { status: 404 })
  }
  const ownerId = typeof club.owner === 'object' ? club.owner?.id : club.owner
  if (ownerId !== user.id) {
    return NextResponse.json({ error: 'Endast ägaren kan ta bort klubben' }, { status: 403 })
  }
  await payload.delete({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  return NextResponse.json({ ok: true })
}
