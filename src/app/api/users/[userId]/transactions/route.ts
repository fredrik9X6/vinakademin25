import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/get-user'
import { getPayload } from 'payload'
import config from '@/payload.config'

// GET user transactions
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

    // Get user transactions
    const transactions = await payload.find({
      collection: 'transactions',
      where: {
        user: {
          equals: userId,
        },
      },
      depth: 2, // Populate relationships
      limit: 100,
      sort: '-createdAt', // Most recent first
    })

    return NextResponse.json({
      success: true,
      data: transactions.docs || [],
      total: transactions.totalDocs,
    })
  } catch (error) {
    console.error('Error fetching user transactions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
