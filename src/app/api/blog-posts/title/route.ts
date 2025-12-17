import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/blog-posts/title?slug=...&preview=true
 *
 * Public-safe endpoint used by the client-side breadcrumbs to resolve the real
 * blog post title for /artiklar/[slug].
 *
 * - Non-admin users can only resolve published posts.
 * - Admin users can resolve drafts when preview=true.
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

    // Auth is optional; public users should still be able to resolve published titles.
    const { user } = await payload
      .auth({
        headers: new Headers({
          Cookie: cookieString,
        }),
      })
      .catch(() => ({ user: null as any }))

    const isAdmin = user?.role === 'admin'
    const wantsPreview = searchParams.get('preview') === 'true'
    const draft = Boolean(isAdmin && wantsPreview)

    const res = await payload.find({
      collection: 'blog-posts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0 as any,
      draft,
      overrideAccess: false,
      req: {
        headers: new Headers({
          Cookie: cookieString,
        }),
        user,
        payload,
      } as any,
    } as any)

    const title = res?.docs?.[0]?.title

    return NextResponse.json(
      {
        title: typeof title === 'string' && title.trim() ? title : null,
      },
      { status: 200 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        title: null,
        error: 'Failed to resolve blog post title',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

