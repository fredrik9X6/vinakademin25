import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/wines/title?slug=...
 *
 * Public-safe endpoint used by the client-side breadcrumbs to resolve the real
 * wine name for /vinlistan/[slug].
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const slugParam = (searchParams.get('slug') || '').trim()
    if (!slugParam) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    const numericId = Number(slugParam)
    const isNumericId = Number.isFinite(numericId) && !Number.isNaN(numericId)

    const res = await payload.find({
      collection: 'wines',
      where: {
        or: [
          { slug: { equals: slugParam } },
          ...(isNumericId ? [{ id: { equals: numericId } }] : []),
        ],
      },
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
