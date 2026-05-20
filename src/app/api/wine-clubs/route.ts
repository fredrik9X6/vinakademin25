import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { generateInviteCode } from '@/lib/blindkamp/invite-codes'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-wine-clubs')

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[åä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    name?: string
    description?: string
  }
  const name = String(body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Namn krävs' }, { status: 400 })

  const payload = await getPayloadClient()
  const baseSlug = slugify(name) || 'vinklubb'

  // Ensure unique slug — append -2, -3 if taken
  let slug = baseSlug
  for (let i = 2; i < 50; i++) {
    const existing = await payload.find({
      collection: 'wine-clubs',
      where: { slug: { equals: slug } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length === 0) break
    slug = `${baseSlug}-${i}`
  }

  let inviteCode = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const dup = await payload.find({
      collection: 'wine-clubs',
      where: { inviteCode: { equals: inviteCode } },
      limit: 1,
      overrideAccess: true,
    })
    if (dup.docs.length === 0) break
    inviteCode = generateInviteCode()
  }

  const created = await payload.create({
    collection: 'wine-clubs',
    data: {
      name,
      slug,
      description: body.description?.trim() || undefined,
      inviteCode,
      owner: user.id,
      members: [
        {
          user: user.id,
          role: 'owner',
          joinedAt: new Date().toISOString(),
        },
      ],
    } as never,
    overrideAccess: true,
  })

  log.info({ clubId: created.id, userId: user.id }, 'wine_club_created')
  return NextResponse.json({ id: created.id, slug: created.slug })
}
