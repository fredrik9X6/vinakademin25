import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'
import { sendTeamNotification } from '@/lib/notify-team'
import { buildNewsletterSignupEmail } from '@/lib/team-emails/newsletter-signup'

const log = loggerFor('api-newsletter-subscribe')

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Giltig e-postadress krävs' }, { status: 400 })
    }

    // Check if Beehiiv API key is configured
    const beehiivApiKey = process.env.BEEHIIV_API_KEY
    const beehiivPublicationId = process.env.BEEHIIV_PUBLICATION_ID

    if (!beehiivApiKey || !beehiivPublicationId) {
      log.error('Beehiiv credentials not configured')
      return NextResponse.json(
        { error: 'Nyhetsbrev-tjänsten är inte konfigurerad' },
        { status: 500 },
      )
    }

    // Subscribe to Beehiiv
    const beehiivResponse = await fetch(
      `https://api.beehiiv.com/v2/publications/${beehiivPublicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${beehiivApiKey}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: false,
          send_welcome_email: true,
          utm_source: 'vinakademin_website',
          utm_medium: 'newsletter_signup',
        }),
      },
    )

    const beehiivData = await beehiivResponse.json()

    if (!beehiivResponse.ok) {
      log.error('Beehiiv API error:', beehiivData)

      // Handle specific Beehiiv errors
      if (beehiivData.errors?.[0]?.detail?.includes('already subscribed')) {
        return NextResponse.json(
          { error: 'Du är redan prenumerant på vårt nyhetsbrev!' },
          { status: 409 },
        )
      }

      return NextResponse.json(
        { error: 'Kunde inte lägga till prenumeration. Försök igen senare.' },
        { status: 500 },
      )
    }

    // Fire-and-forget heads-up to the team. Never blocks the response.
    void notifyTeam({ email, beehiivId: beehiivData.data?.id })

    return NextResponse.json(
      {
        success: true,
        message: 'Tack för din prenumeration!',
        subscription_id: beehiivData.data?.id,
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

async function notifyTeam(input: { email: string; beehiivId?: string }) {
  try {
    const payload = await getPayload({ config })
    const { subject, html } = buildNewsletterSignupEmail({
      email: input.email,
      source: 'newsletter_form',
      beehiivId: input.beehiivId,
    })
    await sendTeamNotification({
      payload,
      subject,
      html,
      replyTo: input.email,
    })
  } catch (err) {
    log.error({ err, email: input.email }, 'newsletter_team_notify_failed')
  }
}
