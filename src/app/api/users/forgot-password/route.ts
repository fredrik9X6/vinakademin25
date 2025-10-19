import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Use PayloadCMS's built-in forgot password method
    await payload.forgotPassword({
      collection: 'users',
      data: {
        email,
      },
    })

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)

    // Don't reveal if the email exists or not for security
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  }
}
