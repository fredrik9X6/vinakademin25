import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'
import { sendTeamNotification } from '@/lib/notify-team'
import { buildNewsletterSignupEmail } from '@/lib/team-emails/newsletter-signup'
import {
  findUserIdByEmail,
  subscribeAndMirror,
} from '@/lib/subscribers'

const log = loggerFor('api-newsletter-subscribe')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email: string = (body?.email || '').trim().toLowerCase()
    const source = (body?.source as string | undefined) || 'footer'

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
    })

    if (!result.ok && !result.alreadySubscribed && !result.beehiivSkipped) {
      log.error({ email, error: result.error }, 'newsletter_subscribe_failed')
      return NextResponse.json(
        { error: 'Kunde inte lägga till prenumeration. Försök igen senare.' },
        { status: 500 },
      )
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
