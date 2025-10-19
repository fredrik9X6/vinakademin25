import { draftMode } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const secret = searchParams.get('secret')

  // Check secret (optional, for security)
  if (secret !== process.env.PAYLOAD_PUBLIC_DRAFT_SECRET && secret !== 'payload-draft-secret') {
    return new NextResponse('Invalid token', { status: 401 })
  }

  // Validate URL parameter
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 })
  }

  try {
    // Enable draft mode
    const draft = await draftMode()
    draft.enable()

    // Create redirect response
    return NextResponse.redirect(new URL(url, request.url))
  } catch (error) {
    console.error('Draft mode error:', error)
    return new NextResponse('Error enabling draft mode', { status: 500 })
  }
}
