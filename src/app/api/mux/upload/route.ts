import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'
import { createDirectUpload } from '@/lib/mux'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Authenticate
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 },
      )
    }

    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: `payload-token=${token.value}`,
      }),
    })

    if (!user || (user.role !== 'admin' && user.role !== 'instructor')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin or instructor role required' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { collectionSlug, documentId } = body as {
      collectionSlug: string
      documentId: string
    }

    if (!collectionSlug || !documentId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'collectionSlug and documentId are required' },
        { status: 400 },
      )
    }

    // Build passthrough value matching existing convention
    let passthrough: string
    if (collectionSlug === 'vinprovningar') {
      passthrough = `vinprovning-preview-${documentId}`
    } else {
      passthrough = String(documentId)
    }

    const corsOrigin = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const upload = await createDirectUpload(passthrough, corsOrigin)

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    })
  } catch (error: any) {
    console.error('Mux direct upload error:', error)
    return NextResponse.json(
      { error: 'Upload creation failed', message: error?.message || 'Could not create upload URL' },
      { status: 500 },
    )
  }
}
