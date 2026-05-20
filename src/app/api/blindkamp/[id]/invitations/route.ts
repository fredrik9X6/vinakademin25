import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { getUser } from '@/lib/get-user'
import { getSiteURL } from '@/lib/site-url'
import {
  buildBlindkampInvitationEmail,
  describeTheme,
} from '@/lib/session-emails/blindkamp-invitation'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-blindkamp-invitations')

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
      depth: 1,
      overrideAccess: true,
    })
  } catch {
    return NextResponse.json({ error: 'Blindkampen finns inte' }, { status: 404 })
  }
  const hostId = typeof battle.host === 'object' ? battle.host?.id : battle.host
  if (hostId !== user.id) {
    return NextResponse.json({ error: 'Endast värden' }, { status: 403 })
  }

  const subs = await payload.find({
    collection: 'blind-battle-submissions',
    where: { and: [{ battle: { equals: battleId } }, { status: { equals: 'invited' } }] },
    depth: 1,
    limit: 100,
    overrideAccess: true,
  })

  const siteUrl = getSiteURL()
  const themeLabel = describeTheme(battle.theme || { wineType: 'any' })
  const hostUser = typeof battle.host === 'object' ? battle.host : null
  const hostName = (hostUser?.firstName || hostUser?.email || 'Värden') as string

  let sent = 0
  for (const sub of subs.docs as any[]) {
    const u = typeof sub.user === 'object' ? sub.user : null
    const email = u?.email || sub.guestEmail
    if (!email) continue
    const submissionUrl = `${siteUrl}/blindkamp/${battleId}/submit?token=${encodeURIComponent(
      sub.submissionToken,
    )}`
    const { subject, html, text } = buildBlindkampInvitationEmail({
      battleTitle: battle.title || 'Blindkamp',
      themeDescription: battle.themeDescription ?? null,
      themeLabel,
      submissionDeadline: battle.submissionDeadline ? new Date(battle.submissionDeadline) : null,
      sessionDate: battle.sessionDate ? new Date(battle.sessionDate) : null,
      hostName,
      submissionUrl,
    })
    try {
      await payload.sendEmail({ to: email, subject, html, text })
      sent += 1
    } catch (err) {
      log.error({ err, email }, 'blindkamp_invitation_failed')
    }
  }
  log.info({ battleId, sent }, 'blindkamp_invitations_sent')
  return NextResponse.json({ ok: true, sent })
}
