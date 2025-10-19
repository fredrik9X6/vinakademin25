import { NextRequest, NextResponse } from 'next/server'

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
      console.error('Beehiiv credentials not configured')
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
      console.error('Beehiiv API error:', beehiivData)

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

    return NextResponse.json(
      {
        success: true,
        message: 'Tack för din prenumeration!',
        subscription_id: beehiivData.data?.id,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: 'Ett oväntat fel uppstod. Försök igen senare.' },
      { status: 500 },
    )
  }
}
