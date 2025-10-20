import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

/**
 * Generate a random 6-character join code (e.g., WINE42, ABC123)
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar-looking chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * POST /api/sessions/create
 * Create a new course session for group learning
 *
 * Body:
 * - courseId: number (required)
 * - sessionName?: string (optional)
 * - maxParticipants?: number (default: 50)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    // Check authentication
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get cookie string and verify user
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, sessionName, maxParticipants = 50 } = body

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 })
    }

    // Verify course exists
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Generate unique join code
    let joinCode = generateJoinCode()
    let isUnique = false
    let attempts = 0

    while (!isUnique && attempts < 10) {
      const existing = await payload.find({
        collection: 'course-sessions',
        where: {
          joinCode: { equals: joinCode },
        },
        limit: 1,
      })

      if (existing.totalDocs === 0) {
        isUnique = true
      } else {
        joinCode = generateJoinCode()
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique join code' }, { status: 500 })
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Create session
    const hostName =
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Anonymous'

    const session = await payload.create({
      collection: 'course-sessions',
      data: {
        course: courseId,
        host: user.id,
        joinCode,
        sessionName: sessionName || `${hostName}'s Session`,
        status: 'active',
        currentActivity: 'waiting',
        participantCount: 0,
        maxParticipants,
        expiresAt: expiresAt.toISOString(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session.id,
          joinCode: session.joinCode,
          sessionName: session.sessionName,
          status: session.status,
          participantCount: session.participantCount,
          maxParticipants: session.maxParticipants,
          expiresAt: session.expiresAt,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
