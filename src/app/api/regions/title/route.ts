import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/regions/title?slug=...
 *
 * Public-safe endpoint used by the client-side breadcrumbs to resolve the real
 * region name for /regioner/[slug].
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const slug = (searchParams.get('slug') || '').trim()
    if (!slug) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    const res = await payload.find({
      collection: 'regions',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })

    const title = res?.docs?.[0]?.name

    return NextResponse.json(
      { title: typeof title === 'string' && title.trim() ? title : null },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      { title: null },
      { status: 500 },
    )
  }
}
