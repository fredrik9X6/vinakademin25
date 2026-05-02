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
} from '@/lib/subscribers'

const log = loggerFor('api-newsletter-subscribe')

/** Map an `ebook:<slug>` tag → builder for that lead-magnet's delivery email. */
const LEAD_MAGNET_BUILDERS: Record<
  string,
  (input: { email: string }) => { subject: string; html: string; text: string }
> = {
  'grunderna-i-vin': (input) => buildEbookGrundernaIVinEmail({ email: input.email }),
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email: string = (body?.email || '').trim().toLowerCase()
    const source = (body?.source as string | undefined) || 'footer'
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
      source: source === 'newsletter_page' ? 'newsletter_page' : 'footer',
      relatedUserId,
      tags: tags.length > 0 ? tags : undefined,
    })

    if (!result.ok && !result.alreadySubscribed && !result.beehiivSkipped) {
      log.error({ email, error: result.error }, 'newsletter_subscribe_failed')
      return NextResponse.json(
        { error: 'Kunde inte lägga till prenumeration. Försök igen senare.' },
        { status: 500 },
      )
    }

    // Lead-magnet delivery: send even when alreadySubscribed so re-entering an
    // email still gets the file. Tag shape is ['lead_magnet', 'ebook:<slug>'].
    const isLeadMagnet = tags.includes('lead_magnet')
    const ebookTag = tags.find((t) => t.startsWith('ebook:'))
    const ebookSlug = ebookTag ? ebookTag.slice('ebook:'.length) : undefined
    if (isLeadMagnet && ebookSlug && LEAD_MAGNET_BUILDERS[ebookSlug]) {
      void deliverLeadMagnet({ payload, email, slug: ebookSlug })
    }

    if (result.alreadySubscribed) {
      return NextResponse.json(
        { error: 'Du är redan prenumerant på vårt nyhetsbrev!' },
        { status: 409 },
      )
    }

    // Fire-and-forget heads-up to the team. Never blocks the response.
    void notifyTeam({ payload, email, source })

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
  slug: string
}) {
  const builder = LEAD_MAGNET_BUILDERS[input.slug]
  if (!builder) return
  try {
    const { subject, html, text } = builder({ email: input.email })
    await input.payload.sendEmail({
      to: input.email,
      subject,
      html,
      text,
    })
    log.info({ email: input.email, slug: input.slug }, 'lead_magnet_delivered')
  } catch (err) {
    log.error({ err, email: input.email, slug: input.slug }, 'lead_magnet_delivery_failed')
  }
}

async function notifyTeam(input: {
  payload: Awaited<ReturnType<typeof getPayload>>
  email: string
  source?: string
}) {
  try {
    const { subject, html } = buildNewsletterSignupEmail({
      email: input.email,
      source: input.source || 'footer',
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
