import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }

    // Use PayloadCMS's built-in reset password method
    await payload.resetPassword({
      collection: 'users',
      data: {
        token,
        password,
      },
      overrideAccess: true,
    })

    return NextResponse.json({
      message: 'Password reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)

    // Handle PayloadCMS validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      return NextResponse.json({ errors: (error as any).errors }, { status: 400 })
    }

    return NextResponse.json({ error: 'Password reset failed' }, { status: 400 })
  }
}
