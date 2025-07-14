import { NextRequest, NextResponse } from 'next/server'
import payload from 'payload'

// GET grapes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const sort = searchParams.get('sort') || 'name'

    const grapes = await payload.find({
      collection: 'grapes',
      limit,
      sort,
    })

    return NextResponse.json({
      success: true,
      docs: grapes.docs,
      totalDocs: grapes.totalDocs,
      page: grapes.page,
      totalPages: grapes.totalPages,
    })
  } catch (error) {
    console.error('Error fetching grapes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
