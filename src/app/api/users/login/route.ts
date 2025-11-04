import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getCookieDomain } from '@/lib/site-url'

/**
 * PayloadCMS 3 compatible login endpoint
 * Uses PayloadCMS's built-in login method while maintaining our custom response format
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Parse request body (handles both JSON and FormData for admin panel compatibility)
    const contentType = request.headers.get('content-type') || ''
    let email: string
    let password: string

    if (contentType.includes('application/json')) {
      // Custom frontend login sends JSON
      const body = await request.json()
      email = body.email
      password = body.password
    } else {
      // PayloadCMS admin login sends FormData with _payload field
      const formData = await request.formData()
      const payloadField = formData.get('_payload') as string

      if (payloadField) {
        const parsedPayload = JSON.parse(payloadField)
        email = parsedPayload.email || ''
        password = parsedPayload.password || ''
      } else {
        // Fallback: try direct field names
        email = (formData.get('email') as string) || ''
        password = (formData.get('password') as string) || ''
      }
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Use PayloadCMS's built-in login method
    const { user, token } = await payload.login({
      collection: 'users',
      data: {
        email,
        password,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Check if user account is active
    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Account is suspended or deactivated' }, { status: 403 })
    }

    // Determine response format based on request source
    const isAdminLogin = !contentType.includes('application/json')

    const response = isAdminLogin
      ? // PayloadCMS admin expects: { user, token }
        NextResponse.json({
          user,
          token,
        })
      : // Custom frontend expects: { user: {...}, message }
        NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            accountStatus: user.accountStatus,
            isVerified: user.isVerified,
          },
          message: 'Login successful',
        })

    // Set authentication cookie matching PayloadCMS configuration
    if (token) {
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
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }

      // Only set domain if explicitly configured (omitting it works better with proxies)
      if (cookieDomain) {
        cookieOptions.domain = cookieDomain
      }

      response.cookies.set('payload-token', token, cookieOptions)
    }

    return response
  } catch (error: any) {
    console.error('Login error:', error)

    // Handle PayloadCMS error format
    if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      return NextResponse.json({ errors: error.errors }, { status: error.status || 401 })
    }

    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
}
