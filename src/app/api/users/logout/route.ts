import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * PayloadCMS 3 compatible logout endpoint
 * Clears authentication cookie
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // PayloadCMS doesn't have a built-in logout method that clears cookies
    // So we just clear the cookie ourselves
    const response = NextResponse.json({
      message: 'Logout successful',
    })

    // Clear the authentication cookie matching PayloadCMS configuration
    response.cookies.set('payload-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.vinakademin.se' : 'localhost',
      path: '/',
      maxAge: 0, // Expire immediately
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
