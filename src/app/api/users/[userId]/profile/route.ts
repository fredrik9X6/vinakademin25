import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// PUT update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    // Use PayloadCMS 3 proper pattern
    const payload = await getPayload({ config })
    const { userId } = await params
    const user = await getUser() // getUser() returns user directly, not { user }

    // Check if user is authenticated and authorized
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this profile (own profile or admin)
    // Convert userId string to number for comparison since PayloadCMS uses numbers for IDs
    if (String(user.id) !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Update user profile using PayloadCMS 3 best practices
    const updatedUser = await payload.update({
      collection: 'users',
      id: parseInt(userId, 10), // Ensure ID is number for PayloadCMS 3
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        bio: body.bio,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        bio: updatedUser.bio,
      },
      message: 'Profile updated successfully',
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
