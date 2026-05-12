import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'

export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const payload = await getPayload({ config })

  const docs = await payload.find({
    collection: 'wines',
    limit: 10,
    depth: 1,
    where: {
      or: [
        { name: { like: q } },
        { winery: { like: q } },
      ],
    },
    sort: 'name',
  })

  const results = docs.docs.map((w: any) => ({
    id: w.id,
    title: w.name,
    producer: w.winery ?? null,
    vintage: w.vintage ?? null,
    region: typeof w.region === 'object' ? w.region?.name ?? null : null,
    thumbnailUrl:
      typeof w.image === 'object' && w.image?.sizes?.thumbnail?.url
        ? w.image.sizes.thumbnail.url
        : typeof w.image === 'object'
          ? w.image?.url ?? null
          : null,
  }))

  return NextResponse.json({ results })
}
