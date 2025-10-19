import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'

// Update user avatar
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { userId } = await params
    const authUser = await getUser()

    if (!authUser) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (String(authUser.id) !== String(userId) && authUser.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { avatar } = body

    if (!avatar) {
      return NextResponse.json({ message: 'Avatar ID is required' }, { status: 400 })
    }

    // Update user's avatar field
    const updatedUser = await payload.update({
      collection: 'users',
      id: userId,
      data: { avatar },
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Avatar update error:', error)
    return NextResponse.json({ message: 'Failed to update avatar' }, { status: 500 })
  }
}
