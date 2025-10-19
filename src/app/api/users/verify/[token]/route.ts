import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    // Use PayloadCMS's built-in verify method
    await payload.verifyEmail({
      collection: 'users',
      token,
    })

    return NextResponse.json({
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('Email verification error:', error)

    // Handle PayloadCMS validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json({ errors: (error as any).errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Email verification failed' }, { status: 400 })
  }
}
