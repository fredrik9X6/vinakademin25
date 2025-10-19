import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'
import { cookies } from 'next/headers'

/**
 * Generate a unique participant token
 */
function generateParticipantToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * POST /api/sessions/join
 * Join a course session with a code (requires authentication)
 *
 * Body:
 * - joinCode: string (required) - 6-character session code
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    // Check authentication
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required', requiresAuth: true },
        { status: 401 },
      )
    }

    // Get cookie string and verify user
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', requiresAuth: true },
        { status: 401 },
      )
    }

    const body = await request.json()
    const { joinCode } = body

    if (!joinCode) {
      return NextResponse.json({ error: 'joinCode is required' }, { status: 400 })
    }

    // Find session by join code
    const sessionResult = await payload.find({
      collection: 'course-sessions',
      where: {
        joinCode: { equals: joinCode.toUpperCase() },
      },
      limit: 1,
    })

    if (sessionResult.totalDocs === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const session = sessionResult.docs[0]

    // Check if session is active
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Session is not active' }, { status: 400 })
    }

    // Check if session has expired
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Session has expired' }, { status: 400 })
    }

    // Check if session is full
    const currentParticipants = Number(session.participantCount ?? 0)
    const maxAllowed = session.maxParticipants != null ? Number(session.maxParticipants) : null
    if (maxAllowed !== null && currentParticipants >= maxAllowed) {
      return NextResponse.json({ error: 'Session is full' }, { status: 400 })
    }

    // Check if user is already a participant in this session
    const existingParticipant = await payload.find({
      collection: 'session-participants',
      where: {
        and: [{ session: { equals: session.id } }, { user: { equals: user.id } }],
      },
      limit: 1,
    })

    let participant

    if (existingParticipant.totalDocs > 0) {
      // User already joined, reactivate if needed
      participant = existingParticipant.docs[0]
      if (!participant.isActive) {
        participant = await payload.update({
          collection: 'session-participants',
          id: participant.id,
          data: {
            isActive: true,
            lastActivityAt: new Date().toISOString(),
          },
        })
      }
    } else {
      // Generate unique participant token
      const participantToken = generateParticipantToken()

      // Use user's name as display name
      const displayName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || user.lastName || user.email?.split('@')[0] || 'Anonymous'

      // Create new participant
      participant = await payload.create({
        collection: 'session-participants',
        data: {
          session: session.id,
          user: user.id,
          nickname: displayName,
          participantToken,
          isActive: true,
          lastActivityAt: new Date().toISOString(),
        },
      })

      // Update session participant count only for new participants
      await payload.update({
        collection: 'course-sessions',
        id: session.id,
        data: {
          participantCount: (session.participantCount || 0) + 1,
        },
      })
    }

    // Get course info
    const courseId = typeof session.course === 'object' ? session.course.id : session.course
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
    })

    return NextResponse.json(
      {
        success: true,
        participant: {
          id: participant.id,
          nickname: participant.nickname,
          participantToken: participant.participantToken,
        },
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        session: {
          id: session.id,
          sessionName: session.sessionName,
          course: {
            id: course.id,
            title: course.title,
            slug: course.slug,
          },
          currentActivity: session.currentActivity,
          currentLesson: session.currentLesson,
          currentQuiz: session.currentQuiz,
          expiresAt: session.expiresAt,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error joining session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
