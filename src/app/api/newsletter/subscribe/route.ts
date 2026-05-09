import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'
import { sendTeamNotification } from '@/lib/notify-team'
import { buildNewsletterSignupEmail } from '@/lib/team-emails/newsletter-signup'
import { buildEbookGrundernaIVinEmail } from '@/lib/lead-magnet-emails/ebook-grunderna-i-vin'
import {
  findUserIdByEmail,
  subscribeAndMirror,
  LEAD_MAGNET_TYPES,
  type Source,
  type LeadMagnetRef,
  type LeadMagnetType,
} from '@/lib/subscribers'

const log = loggerFor('api-newsletter-subscribe')

/**
 * Lead-magnet delivery registry. Keyed by `${type}:${slug}` — that's the same
 * shape used in Beehiiv tags and in the typed `Subscribers.leadMagnet` field,
 * so adding a new magnet means: register here, set the form's `leadMagnetType`
 * + `slug`, done. Quiz-style magnets (results page IS the delivery) just don't
 * register a builder — that's the "no email needed" case.
 */
const LEAD_MAGNET_BUILDERS: Record<
  string,
  (input: { email: string }) => { subject: string; html: string; text: string }
> = {
  'ebook:grunderna-i-vin': (input) => buildEbookGrundernaIVinEmail({ email: input.email }),
}

const PUBLIC_SOURCES = new Set<Source>(['footer', 'newsletter_page'])

function parseSource(raw: unknown): Source {
  return typeof raw === 'string' && (PUBLIC_SOURCES as Set<string>).has(raw)
    ? (raw as Source)
    : 'footer'
}

function parseLeadMagnet(raw: unknown): LeadMagnetRef | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const type = obj.type
  const slug = obj.slug
  if (typeof type !== 'string' || typeof slug !== 'string') return undefined
  if (!(LEAD_MAGNET_TYPES as readonly string[]).includes(type)) return undefined
  const trimmedSlug = slug.trim()
  if (!trimmedSlug) return undefined
  return { type: type as LeadMagnetType, slug: trimmedSlug }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email: string = (body?.email || '').trim().toLowerCase()
    const source = parseSource(body?.source)
    const leadMagnet = parseLeadMagnet(body?.leadMagnet)
    const rawTags = Array.isArray(body?.tags) ? (body.tags as unknown[]) : []
    const tags = rawTags
      .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim())
      .slice(0, 8)

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Giltig e-postadress krävs' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const relatedUserId = await findUserIdByEmail(payload, email)

    const result = await subscribeAndMirror({
      payload,
      email,
      source,
      relatedUserId,
      tags: tags.length > 0 ? tags : undefined,
      leadMagnet,
    })

    if (!result.ok && !result.alreadySubscribed && !result.beehiivSkipped) {
      log.error({ email, error: result.error }, 'newsletter_subscribe_failed')
      return NextResponse.json(
        { error: 'Kunde inte lägga till prenumeration. Försök igen senare.' },
        { status: 500 },
      )
    }

    // Lead-magnet delivery: send even when alreadySubscribed so re-entering an
    // email still gets the file. Dispatch keyed off the typed leadMagnet field.
    if (leadMagnet) {
      const builderKey = `${leadMagnet.type}:${leadMagnet.slug}`
      if (LEAD_MAGNET_BUILDERS[builderKey]) {
        void deliverLeadMagnet({ payload, email, key: builderKey })
      }
    }

    if (result.alreadySubscribed) {
      return NextResponse.json(
        { error: 'Du är redan prenumerant på vårt nyhetsbrev!' },
        { status: 409 },
      )
    }

    // Fire-and-forget heads-up to the team. Never blocks the response.
    void notifyTeam({ payload, email, source, leadMagnet })

    return NextResponse.json(
      {
        success: true,
        message: 'Tack för din prenumeration!',
      },
      { status: 200 },
    )
  } catch (error) {
    log.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod. Försök igen senare.' },
      { status: 500 },
    )
  }
}

async function deliverLeadMagnet(input: {
  payload: Awaited<ReturnType<typeof getPayload>>
  email: string
  key: string
}) {
  const builder = LEAD_MAGNET_BUILDERS[input.key]
  if (!builder) return
  try {
    const { subject, html, text } = builder({ email: input.email })
    await input.payload.sendEmail({
      to: input.email,
      subject,
      html,
      text,
    })
    log.info({ email: input.email, leadMagnet: input.key }, 'lead_magnet_delivered')
  } catch (err) {
    log.error({ err, email: input.email, leadMagnet: input.key }, 'lead_magnet_delivery_failed')
  }
}

async function notifyTeam(input: {
  payload: Awaited<ReturnType<typeof getPayload>>
  email: string
  source?: string
  leadMagnet?: LeadMagnetRef
}) {
  try {
    const sourceLabel = input.leadMagnet
      ? `${input.source || 'footer'} (${input.leadMagnet.type}:${input.leadMagnet.slug})`
      : input.source || 'footer'
    const { subject, html } = buildNewsletterSignupEmail({
      email: input.email,
      source: sourceLabel,
    })
    await sendTeamNotification({
      payload: input.payload,
      subject,
      html,
      replyTo: input.email,
    })
  } catch (err) {
    log.error({ err, email: input.email }, 'newsletter_team_notify_failed')
  }
}
