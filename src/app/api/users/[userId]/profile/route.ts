import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-users-[userId]-profile')

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

    // Fetch the existing user first so we can lock the handle once it's set.
    const existing = (await payload.findByID({
      collection: 'users',
      id: parseInt(userId, 10),
      overrideAccess: true,
    })) as any
    const existingHandle =
      typeof existing?.handle === 'string' && existing.handle.trim()
        ? existing.handle.trim().toLowerCase()
        : null

    log.info(
      {
        userId,
        bodyHandle: body.handle,
        bodyBio: body.bio,
        bodyProfilePublic: body.profilePublic,
        existingHandle,
      },
      'profile_put_request',
    )

    const data: Record<string, unknown> = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      bio: body.bio,
    }
    // Only allow setting the handle when it's currently empty/null.
    // Once set, the handle is permanent at the API level.
    if (!existingHandle && body.handle != null && body.handle !== '') {
      data.handle = body.handle
    }
    // profilePublic always passes through (it's the visibility toggle, not the slug).
    if (typeof body.profilePublic === 'boolean') {
      data.profilePublic = body.profilePublic
    }

    const updatedUser = await payload.update({
      collection: 'users',
      id: parseInt(userId, 10),
      data,
      overrideAccess: true,
    })

    log.info(
      {
        userId,
        savedHandle: (updatedUser as any).handle,
        savedBio: (updatedUser as any).bio,
        savedProfilePublic: (updatedUser as any).profilePublic,
      },
      'profile_put_response',
    )

    return NextResponse.json({
      success: true,
      data: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        bio: updatedUser.bio,
        handle: updatedUser.handle,
        profilePublic: (updatedUser as any).profilePublic,
      },
      message: 'Profile updated successfully',
    })
  } catch (error) {
    log.error('Error updating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
