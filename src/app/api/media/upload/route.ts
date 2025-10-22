import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Get authentication from cookies
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Du måste vara inloggad för att ladda upp filer' },
        { status: 401 },
      )
    }

    // Authenticate the request
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: `payload-token=${token.value}`,
      }),
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Du måste vara inloggad för att ladda upp filer' },
        { status: 401 },
      )
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const alt = formData.get('alt') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Ingen fil bifogad' },
        { status: 400 },
      )
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create the media document
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt || `Uploaded by ${user.email}`,
      },
      file: {
        data: buffer,
        mimetype: file.type,
        name: file.name,
        size: file.size,
      },
      user,
    })

    return NextResponse.json({
      success: true,
      doc: media,
    })
  } catch (error: any) {
    console.error('Media upload error:', error)
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error?.message || 'Kunde inte ladda upp filen',
      },
      { status: 500 },
    )
  }
}



