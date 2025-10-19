import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att se ordrar' },
        { status: 401 },
      )
    }

    const payload = await getPayload({ config })
    const { userId } = await params

    // Check if user can access this data (own data or admin)
    if (userId !== user.id.toString() && user.role !== 'admin') {
      return NextResponse.json({ error: 'Otillåtet' }, { status: 403 })
    }

    const orders = await payload.find({
      collection: 'orders',
      where: {
        user: { equals: userId },
      },
      sort: '-createdAt',
      depth: 1, // Include related course data
    })

    return NextResponse.json({ orders: orders.docs })
  } catch (error) {
    console.error('Error fetching user orders:', error)
    return NextResponse.json({ error: 'Ett fel uppstod vid hämtning av ordrar' }, { status: 500 })
  }
}
