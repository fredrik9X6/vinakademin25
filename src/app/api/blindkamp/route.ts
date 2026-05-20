import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { generateInviteCode } from '@/lib/blindkamp/invite-codes'
import { generateSubmissionToken } from '@/lib/blindkamp/tokens'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp')

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Logga in först' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    clubId?: number | null
    theme: { wineType: string; priceMinSek?: number | null; priceMaxSek?: number | null }
    themeDescription?: string
    submissionDeadline?: string | null
    sessionDate?: string | null
    wineCount?: number | null
    revealStrategy?: 'one_by_one' | 'all_at_end'
    inviteUserIds?: number[]
  }
  if (!body.theme?.wineType) {
    return NextResponse.json({ error: 'Tema krävs' }, { status: 400 })
  }

  const payload = await getPayloadClient()

  // If clubId set, verify viewer is a member
  if (body.clubId) {
    try {
      const club = (await payload.findByID({
        collection: 'wine-clubs',
        id: body.clubId,
        overrideAccess: true,
      })) as any
      const isMember = (club.members ?? []).some((m: any) => {
        const uid = typeof m.user === 'object' ? m.user?.id : m.user
        return uid === user.id
      })
      if (!isMember) {
        return NextResponse.json({ error: 'Inte medlem i klubben' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Klubben finns inte' }, { status: 404 })
    }
  }

  // Unique invite code
  let inviteCode = generateInviteCode()
  for (let i = 0; i < 5; i++) {
    const dup = await payload.find({
      collection: 'blind-battles',
      where: { inviteCode: { equals: inviteCode } },
      limit: 1,
      overrideAccess: true,
    })
    if (dup.docs.length === 0) break
    inviteCode = generateInviteCode()
  }

  const battle = await payload.create({
    collection: 'blind-battles',
    data: {
      title: body.title?.trim() || undefined,
      theme: {
        wineType: body.theme.wineType,
        priceMinSek: body.theme.priceMinSek ?? undefined,
        priceMaxSek: body.theme.priceMaxSek ?? undefined,
      },
      themeDescription: body.themeDescription?.trim() || undefined,
      host: user.id,
      club: body.clubId ?? undefined,
      status: 'submissions_open',
      submissionDeadline: body.submissionDeadline || undefined,
      sessionDate: body.sessionDate || undefined,
      wineCount: body.wineCount ?? undefined,
      revealStrategy: body.revealStrategy ?? 'all_at_end',
      inviteCode,
    } as never,
    overrideAccess: true,
  })

  // Create one submission row per invitee + the host
  const invitees = Array.from(new Set(body.inviteUserIds ?? []))
  for (const inviteeId of invitees) {
    const token = generateSubmissionToken(battle.id as number, String(inviteeId))
    await payload.create({
      collection: 'blind-battle-submissions',
      data: {
        battle: battle.id,
        user: inviteeId,
        status: 'invited',
        submissionToken: token,
      } as never,
      overrideAccess: true,
    })
  }

  // Host also plays — auto-create their submission row
  const hostToken = generateSubmissionToken(battle.id as number, String(user.id))
  await payload.create({
    collection: 'blind-battle-submissions',
    data: {
      battle: battle.id,
      user: user.id,
      status: 'invited',
      submissionToken: hostToken,
    } as never,
    overrideAccess: true,
  })

  log.info(
    { battleId: battle.id, clubId: body.clubId, invitees: invitees.length },
    'blind_battle_created',
  )
  return NextResponse.json({ id: battle.id })
}
