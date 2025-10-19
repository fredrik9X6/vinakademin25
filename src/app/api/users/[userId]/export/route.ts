import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// POST request to initiate data export
export async function POST(
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

    // Fetch all user data with related collections
    const userData = await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 2, // Include related data
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Fetch related data
    const [enrollments, transactions, userProgress, userWines, userWineLists] = await Promise.all([
      payload.find({
        collection: 'enrollments',
        where: {
          user: {
            equals: userId,
          },
        },
        depth: 1,
      }),
      payload.find({
        collection: 'transactions',
        where: {
          user: {
            equals: userId,
          },
        },
        depth: 1,
      }),
      payload.find({
        collection: 'user-progress',
        where: {
          user: {
            equals: userId,
          },
        },
        depth: 1,
      }),
      payload.find({
        collection: 'user-wines',
        where: {
          user: {
            equals: userId,
          },
        },
        depth: 1,
      }),
      payload.find({
        collection: 'user-wine-lists',
        where: {
          user: {
            equals: userId,
          },
        },
        depth: 1,
      }),
    ])

    // Compile comprehensive user data export
    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        bio: userData.bio,
        role: userData.role,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        winePreferences: userData.winePreferences,
        notifications: userData.notifications,
      },
      enrollments: enrollments.docs || [],
      transactions: transactions.docs || [],
      userProgress: userProgress.docs || [],
      userWines: userWines.docs || [],
      userWineLists: userWineLists.docs || [],
    }

    // Create a temporary file or return the data directly
    // For now, we'll return the data as JSON with proper headers for download
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-data-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
        'Content-Length': jsonString.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET request to check export status (for future background job implementation)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
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

    // For now, return a simple status
    // In the future, this could check a background job status
    return NextResponse.json({
      success: true,
      data: {
        status: 'ready',
        message: 'Data export is ready for immediate download',
      },
    })
  } catch (error) {
    console.error('Error checking export status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
