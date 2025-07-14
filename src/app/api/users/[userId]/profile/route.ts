import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import payload from 'payload'

// PUT update user profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params
    const { user } = await getUser()

    // Check if user is authenticated and authorized
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this profile (own profile or admin)
    if (user.id !== parseInt(userId) && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Update user profile information
    const updatedUser = await payload.update({
      collection: 'users',
      id: userId,
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
