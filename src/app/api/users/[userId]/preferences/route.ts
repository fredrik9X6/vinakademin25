import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import payload from 'payload'

// GET user preferences
export async function GET(
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

    // Fetch user with wine preferences
    const userData = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 2, // To populate grape and region relationships
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: userData.winePreferences || {},
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update user preferences
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

    // Update user wine preferences
    const updatedUser = await payload.update({
      collection: 'users',
      id: userId,
      data: {
        winePreferences: body,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedUser.winePreferences,
      message: 'Preferences updated successfully',
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
