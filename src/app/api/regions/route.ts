import { NextRequest, NextResponse } from 'next/server'
import payload from 'payload'

// GET regions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const sort = searchParams.get('sort') || 'name'
    const depth = parseInt(searchParams.get('depth') || '1')

    const regions = await payload.find({
      collection: 'regions',
      limit,
      sort,
      depth,
    })

    return NextResponse.json({
      success: true,
      docs: regions.docs,
      totalDocs: regions.totalDocs,
      page: regions.page,
      totalPages: regions.totalPages,
    })
  } catch (error) {
    console.error('Error fetching regions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
