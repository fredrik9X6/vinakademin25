import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const path = searchParams.get('path')
    const tag = searchParams.get('tag')

    // Check for secret to confirm this is a valid request
    if (!secret || secret !== process.env.REVALIDATION_KEY) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Revalidate specific path
    if (path) {
      await revalidatePath(path)
      return NextResponse.json({
        message: `Revalidated path: ${path}`,
        revalidated: true,
        now: Date.now(),
      })
    }

    // Revalidate by tag
    if (tag) {
      await revalidateTag(tag)
      return NextResponse.json({
        message: `Revalidated tag: ${tag}`,
        revalidated: true,
        now: Date.now(),
      })
    }

    // If no specific path or tag, revalidate common paths
    const commonPaths = ['/artiklar', '/vinprovningar', '/']
    for (const commonPath of commonPaths) {
      await revalidatePath(commonPath)
    }

    return NextResponse.json({
      message: 'Revalidated common paths',
      revalidated: true,
      paths: commonPaths,
      now: Date.now(),
    })
  } catch (error) {
    console.error('Error during revalidation:', error)
    return NextResponse.json(
      {
        message: 'Error revalidating',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Revalidation endpoint is available. Use POST method to trigger revalidation.',
    usage: {
      path: '?secret=YOUR_SECRET&path=/artiklar/post-slug',
      tag: '?secret=YOUR_SECRET&tag=blog-posts',
    },
  })
}
