import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { id } = await ctx.params
  const clubId = parseInt(id, 10)
  if (Number.isNaN(clubId)) return NextResponse.json({ error: 'Ogiltigt id' }, { status: 400 })
  const body = (await req.json()) as {
    action: 'invite' | 'remove' | 'role'
    email?: string
    userId?: number
    role?: 'admin' | 'member'
  }

  const payload = await getPayloadClient()
  let club: any
  try {
    club = await payload.findByID({ collection: 'wine-clubs', id: clubId, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'Klubben finns inte' }, { status: 404 })
  }
  const myMembership = (club.members ?? []).find((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (!myMembership || (myMembership.role !== 'owner' && myMembership.role !== 'admin')) {
    return NextResponse.json({ error: 'Saknar rättigheter' }, { status: 403 })
  }

  if (body.action === 'invite') {
    const email = String(body.email || '').trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'E-post krävs' }, { status: 400 })
    const users = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    if (users.docs.length === 0) {
      return NextResponse.json({ error: 'Användaren saknar konto. Bjud in dem att skapa ett först.' }, { status: 400 })
    }
    const newUser = users.docs[0] as any
    const already = (club.members ?? []).some((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      return uid === newUser.id
    })
    if (already) return NextResponse.json({ error: 'Redan medlem' }, { status: 400 })
    const nextMembers = [
      ...(club.members ?? []),
      { user: newUser.id, role: 'member', joinedAt: new Date().toISOString() },
    ]
    await payload.update({
      collection: 'wine-clubs',
      id: clubId,
      data: { members: nextMembers } as never,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'remove') {
    const targetId = body.userId
    if (targetId == null) return NextResponse.json({ error: 'userId krävs' }, { status: 400 })
    const target = (club.members ?? []).find(
      (m: any) => (typeof m.user === 'object' ? m.user?.id : m.user) === targetId,
    )
    if (target?.role === 'owner') {
      return NextResponse.json({ error: 'Ägaren kan inte tas bort' }, { status: 400 })
    }
    const nextMembers = (club.members ?? []).filter(
      (m: any) => (typeof m.user === 'object' ? m.user?.id : m.user) !== targetId,
    )
    await payload.update({
      collection: 'wine-clubs',
      id: clubId,
      data: { members: nextMembers } as never,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'role') {
    if (myMembership.role !== 'owner') {
      return NextResponse.json({ error: 'Endast ägaren' }, { status: 403 })
    }
    const targetId = body.userId
    const newRole = body.role
    if (targetId == null || !newRole) {
      return NextResponse.json({ error: 'userId + role krävs' }, { status: 400 })
    }
    const nextMembers = (club.members ?? []).map((m: any) => {
      const uid = typeof m.user === 'object' ? m.user?.id : m.user
      if (uid !== targetId) return m
      if (m.role === 'owner') return m
      return { ...m, role: newRole }
    })
    await payload.update({
      collection: 'wine-clubs',
      id: clubId,
      data: { members: nextMembers } as never,
      overrideAccess: true,
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Okänd action' }, { status: 400 })
}
