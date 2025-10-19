import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Get the cookie string from the request
    const cookieString = request.headers.get('cookie') || ''

    // Use PayloadCMS's built-in auth method to verify the user
    const { user: authUser } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch the full user data with avatar relationship populated
    const user = await payload.findByID({
      collection: 'users',
      id: authUser.id,
      depth: 2, // Populate avatar relationship
    })

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user account is active
    if (user.accountStatus !== 'active') {
      return NextResponse.json({ error: 'Account is suspended or deactivated' }, { status: 403 })
    }

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
