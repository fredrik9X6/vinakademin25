import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * PayloadCMS 3 compatible /api/users/me endpoint
 * Returns current authenticated user with avatar relationship populated
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Use PayloadCMS 3 native auth method
    const { user: authUser } = await payload.auth({
      headers: request.headers,
    })

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch full user data with relationships populated (for avatar)
    const user = await payload.findByID({
      collection: 'users',
      id: authUser.id,
      depth: 2, // Populate avatar relationship
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Account is suspended or deactivated' }, { status: 403 })
    }

    // Return user in PayloadCMS 3 format: { user: {...} }
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountStatus: user.accountStatus,
        isVerified: user.isVerified,
        avatar: user.avatar, // Include avatar relationship
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}
