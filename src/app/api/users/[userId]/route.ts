import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// DELETE user account
export async function DELETE(
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
    if (String(user.id) !== userId && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // For security reasons, we'll anonymize the user data instead of completely deleting
    // This maintains referential integrity while protecting user privacy
    const anonymizedData = {
      firstName: 'Deleted',
      lastName: 'User',
      email: `deleted-${Date.now()}@deleted.local`,
      bio: '',
      avatar: null,
      accountStatus: 'deactivated',
      // Anonymize wine preferences
      winePreferences: {
        favoriteGrapes: [],
        favoriteRegions: [],
        preferredStyles: [],
        tastingExperience: null,
        discoveryPreferences: [],
        priceRange: null,
        tastingNotes: '',
      },
      // Anonymize notification preferences
      notifications: {
        email: {
          courseProgress: false,
          newCourses: false,
          wineRecommendations: false,
          tastingEvents: false,
          newsletter: false,
          accountUpdates: false,
        },
        push: {
          courseReminders: false,
          tastingReminders: false,
          achievements: false,
          socialActivity: false,
        },
        platform: {
          inAppMessages: false,
          systemAnnouncements: false,
          maintenanceAlerts: false,
          featureUpdates: false,
        },
      },
      // Add deletion metadata
      deletedAt: new Date().toISOString(),
      deletionReason: 'User requested account deletion',
    }

    // Update user with anonymized data
    await payload.update({
      collection: 'users',
      id: userId,
      data: anonymizedData,
    })

    // Cancel any active subscriptions
    const subscriptions = await payload.find({
      collection: 'subscriptions',
      where: {
        user: { equals: userId },
        status: { equals: 'active' },
      },
    })

    for (const subscription of subscriptions.docs) {
      await payload.update({
        collection: 'subscriptions',
        id: subscription.id,
        data: {
          status: 'canceled',
          canceledAt: new Date().toISOString(),
          cancelReason: 'Account deletion',
        },
      })
    }

    // Log the deletion for audit purposes
    console.log(`User account ${userId} has been anonymized due to deletion request`)

    return NextResponse.json({
      success: true,
      message: 'Account has been successfully deleted and anonymized',
    })
  } catch (error) {
    console.error('Error deleting user account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
