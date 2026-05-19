import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })
  const { inviteCode } = (await req.json()) as { inviteCode?: string }
  if (!inviteCode) return NextResponse.json({ error: 'Kod saknas' }, { status: 400 })

  const payload = await getPayloadClient()
  const found = await payload.find({
    collection: 'wine-clubs',
    where: { inviteCode: { equals: inviteCode } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs.length === 0) return NextResponse.json({ error: 'Ogiltig kod' }, { status: 404 })
  const club = found.docs[0] as any

  const already = (club.members ?? []).some((m: any) => {
    const uid = typeof m.user === 'object' ? m.user?.id : m.user
    return uid === user.id
  })
  if (already) return NextResponse.json({ ok: true, slug: club.slug })

  const nextMembers = [
    ...(club.members ?? []),
    { user: user.id, role: 'member', joinedAt: new Date().toISOString() },
  ]
  await payload.update({
    collection: 'wine-clubs',
    id: club.id,
    data: { members: nextMembers } as never,
    overrideAccess: true,
  })
  return NextResponse.json({ ok: true, slug: club.slug })
}
