import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/vinprovningar/title?slug=...&preview=true
 *
 * Public-safe endpoint used by the client-side breadcrumbs to resolve the real
 * vinprovning title for /vinprovningar/[slug].
 */
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    const slug = (searchParams.get('slug') || '').trim()
    if (!slug) {
      return NextResponse.json({ title: null }, { status: 400 })
    }

    const cookieString = request.headers.get('cookie') || ''

    const { user } = await payload
      .auth({
        headers: new Headers({ Cookie: cookieString }),
      })
      .catch(() => ({ user: null as any }))

    const isAdmin = user?.role === 'admin' || user?.role === 'instructor'
    const wantsPreview = searchParams.get('preview') === 'true'
    const draft = Boolean(isAdmin && wantsPreview)

    const res = await payload.find({
      collection: 'vinprovningar',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0 as any,
      draft,
      overrideAccess: false,
      req: {
        headers: new Headers({ Cookie: cookieString }),
        user,
        payload,
      } as any,
    } as any)

    const title = res?.docs?.[0]?.title

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
