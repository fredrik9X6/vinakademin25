import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'

/**
 * GET /api/sessions/[sessionId]
 * Get session status and participants
 *
 * Query params:
 * - participantToken?: string - Token to verify participant access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { sessionId } = await params
    const { searchParams } = new URL(request.url)
    const participantToken = searchParams.get('participantToken')

    // Find session
    const session = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get participants with user data populated
    const participants = await payload.find({
      collection: 'session-participants',
      where: {
        session: { equals: sessionId },
        isActive: { equals: true },
      },
      depth: 2, // Populate user relationship and their avatars
      limit: 100,
      sort: 'createdAt',
    })

    // Get course info
    const courseId = typeof session.course === 'object' ? session.course.id : session.course
    const course = await payload.findByID({
      collection: 'courses',
      id: courseId,
    })

    // Check if requester is host
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })
    const hostId = typeof session.host === 'object' ? session.host.id : session.host
    const isHost = user && user.id === hostId

    // Check if requester is a participant
    const isParticipant = participantToken
      ? participants.docs.some((p) => p.participantToken === participantToken)
      : false

    // Map participants with user info (all participants can see each other)
    const getAvatarUrl = (userDoc: any) => {
      const avatar = userDoc?.avatar
      if (!avatar) return null
      if (typeof avatar === 'object') {
        if (typeof avatar.url === 'string') return avatar.url
        if (avatar.sizes) {
          for (const value of Object.values(avatar.sizes)) {
            if (value && typeof value === 'object' && typeof (value as any).url === 'string') {
              return (value as any).url
            }
          }
        }
      }
      return null
    }

    const participantsList = participants.docs.map((p) => {
      const userObj = typeof p.user === 'object' ? p.user : null
      return {
        id: p.id,
        nickname: p.nickname,
        joinedAt: p.createdAt,
        isActive: p.isActive,
        isHost: false,
        user: userObj
          ? {
              id: userObj.id,
              firstName: userObj.firstName,
              lastName: userObj.lastName,
              email: userObj.email,
              avatarUrl: getAvatarUrl(userObj),
            }
          : null,
      }
    })

    // Fetch host user and add them to the top of the participants list
    const hostUser = await payload.findByID({
      collection: 'users',
      id: hostId,
      depth: 1,
    })

    if (hostUser) {
      participantsList.unshift({
        id: hostUser.id, // Note: This is the user ID, not a participant ID
        nickname: 'Värd',
        joinedAt: session.createdAt,
        isActive: true,
        isHost: true,
        user: {
          id: hostUser.id,
          firstName: hostUser.firstName,
          lastName: hostUser.lastName,
          email: hostUser.email,
          avatarUrl: getAvatarUrl(hostUser),
        },
      })
    }

    // Return appropriate data based on role
    const responseData = {
      success: true,
      session: {
        id: session.id,
        joinCode: isHost ? session.joinCode : undefined, // Only host sees join code
        sessionName: session.sessionName,
        status: session.status,
        currentActivity: session.currentActivity,
        participantCount: session.participantCount,
        maxParticipants: session.maxParticipants,
        expiresAt: session.expiresAt,
        course: {
          id: course.id,
          title: course.title,
          slug: course.slug,
        },
        currentLesson: session.currentLesson,
        currentQuiz: session.currentQuiz,
      },
      role: isHost ? 'host' : isParticipant ? 'participant' : 'observer',
      participants: participantsList,
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * PATCH /api/sessions/[sessionId]
 * Update session (host only)
 *
 * Body:
 * - status?: 'active' | 'paused' | 'completed'
 * - currentActivity?: 'waiting' | 'video' | 'quiz' | 'wine_review' | 'results'
 * - currentLesson?: number
 * - currentQuiz?: number
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { sessionId } = await params

    // Check authentication
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find session
    const session = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is host
    const hostId = typeof session.host === 'object' ? session.host.id : session.host
    if (user.id !== hostId) {
      return NextResponse.json({ error: 'Only the host can update the session' }, { status: 403 })
    }

    const body = await request.json()
    const { status, currentActivity, currentLesson, currentQuiz } = body

    // Build update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (currentActivity) updateData.currentActivity = currentActivity
    if (currentLesson !== undefined) updateData.currentLesson = currentLesson
    if (currentQuiz !== undefined) updateData.currentQuiz = currentQuiz

    // Update session
    const updatedSession = await payload.update({
      collection: 'course-sessions',
      id: sessionId,
      data: updateData,
    })

    return NextResponse.json(
      {
        success: true,
        session: {
          id: updatedSession.id,
          status: updatedSession.status,
          currentActivity: updatedSession.currentActivity,
          currentLesson: updatedSession.currentLesson,
          currentQuiz: updatedSession.currentQuiz,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

/**
 * DELETE /api/sessions/[sessionId]
 * End session (host only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const payload = await getPayload({ config })
    const { sessionId } = await params

    // Check authentication
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find session
    const session = await payload.findByID({
      collection: 'course-sessions',
      id: sessionId,
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is host
    const hostId = typeof session.host === 'object' ? session.host.id : session.host
    if (user.id !== hostId) {
      return NextResponse.json({ error: 'Only the host can end the session' }, { status: 403 })
    }

    // Mark session as completed
    await payload.update({
      collection: 'course-sessions',
      id: sessionId,
      data: {
        status: 'completed',
      },
    })

    // Deactivate all participants
    const participants = await payload.find({
      collection: 'session-participants',
      where: {
        session: { equals: sessionId },
      },
      limit: 1000,
    })

    for (const participant of participants.docs) {
      await payload.update({
        collection: 'session-participants',
        id: participant.id,
        data: {
          isActive: false,
        },
      })
    }

    return NextResponse.json({ success: true, message: 'Session ended' }, { status: 200 })
  } catch (error) {
    console.error('Error ending session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
