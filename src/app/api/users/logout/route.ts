import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCookieDomain } from '@/lib/site-url'

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
    const cookieDomain = getCookieDomain()
    const cookieOptions: {
      httpOnly: boolean
      secure: boolean
      sameSite: 'lax' | 'strict'
      path: string
      maxAge: number
      domain?: string
    } = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Use 'lax' instead of 'none' for better security and Cloudflare compatibility
      path: '/',
      maxAge: 0, // Expire immediately
    }

    // Only set domain if explicitly configured (omitting it works better with proxies)
    if (cookieDomain) {
      cookieOptions.domain = cookieDomain
    }

    response.cookies.set('payload-token', '', cookieOptions)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
