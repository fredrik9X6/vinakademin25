import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/content-items/title?id=...
 *
 * Public-safe endpoint used by the client-side breadcrumbs to resolve a
 * content item's (lesson or quiz) display title for course viewer URLs like
 * `/vinprovningar/{slug}?lesson={id}` and `?quiz={id}`. Returns title only.
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const idRaw = (searchParams.get('id') || '').trim()
    if (!idRaw) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    const id = Number(idRaw)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    const doc = await payload
      .findByID({
        collection: 'content-items',
        id,
        depth: 0,
        overrideAccess: true,
      })
      .catch(() => null)

    const title = (doc as any)?.title
    return NextResponse.json(
      { title: typeof title === 'string' && title.trim() ? title : null },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ title: null }, { status: 500 })
  }
}
