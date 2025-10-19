import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET user notification preferences
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await params
    const user = await getUser()

    // Check if user is authenticated and authorized
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can access this profile (own profile or admin)
    // Convert userId string to number for comparison since PayloadCMS uses numbers for IDs
    if (String(user.id) !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch user with notification preferences
    const userData = await payload.findByID({
      collection: 'users',
      id: userId,
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: userData.notifications || {
        email: {
          courseProgress: true,
          newCourses: true,
          wineRecommendations: true,
          tastingEvents: true,
          newsletter: true,
          accountUpdates: true,
        },
        push: {
          courseReminders: true,
          tastingReminders: true,
          achievements: true,
          socialActivity: false,
        },
        platform: {
          inAppMessages: true,
          systemAnnouncements: true,
          maintenanceAlerts: true,
          featureUpdates: false,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update user notification preferences
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await params
    const user = await getUser()

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

    // Update user notification preferences
    const updatedUser = await payload.update({
      collection: 'users',
      id: userId,
      data: {
        notifications: body,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedUser.notifications,
      message: 'Notification preferences updated successfully',
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
