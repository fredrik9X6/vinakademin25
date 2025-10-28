import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

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

    // TODO: Send email notification to admin
    // You can implement email sending here using your preferred email service

    return NextResponse.json({ success: true, message: 'Contact form submitted successfully' })
  } catch (error) {
    console.error('Error handling contact form:', error)
    return NextResponse.json({ error: 'Failed to submit contact form' }, { status: 500 })
  }
}
