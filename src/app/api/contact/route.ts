import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-contact')

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Create contact submission in database
    await payload.create({
      collection: 'contact-submissions' as any,
      data: {
        name,
        email,
        phone: phone || undefined,
        subject,
        message,
        status: 'new',
        submittedAt: new Date().toISOString(),
      },
    })

    // Notify the team — otherwise submissions sit unseen in the admin
    // collection. Failure here must not fail the submission (it's saved).
    const notifyTo = process.env.CONTACT_NOTIFICATIONS_EMAIL || 'hej@vinakademin.se'
    try {
      const lines = [
        `Namn: ${name}`,
        `E-post: ${email}`,
        ...(phone ? [`Telefon: ${phone}`] : []),
        `Ämne: ${subject}`,
        '',
        message,
      ]
      await payload.sendEmail({
        to: notifyTo,
        replyTo: email,
        subject: `Nytt meddelande via kontaktformuläret: ${subject}`,
        text: lines.join('\n'),
        html: `<p><strong>Namn:</strong> ${escapeHtml(name)}<br/><strong>E-post:</strong> ${escapeHtml(email)}${
          phone ? `<br/><strong>Telefon:</strong> ${escapeHtml(phone)}` : ''
        }<br/><strong>Ämne:</strong> ${escapeHtml(subject)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      })
    } catch (emailError) {
      log.error('Failed to send contact notification email:', emailError)
    }

    return NextResponse.json({ success: true, message: 'Contact form submitted successfully' })
  } catch (error) {
    log.error('Error handling contact form:', error)
    return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 })
  }
}
