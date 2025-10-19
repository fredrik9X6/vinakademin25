import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { cookies } from 'next/headers'

/**
 * POST /api/sessions/leave
 * Leave a group session and mark participant as inactive
 */
export async function POST(request: NextRequest) {
  console.log('👋 [LEAVE SESSION] Request received')

  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')

    // Check authentication
    if (!token) {
      console.log('❌ [LEAVE SESSION] Not authenticated')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get cookie string and verify user
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({
        Cookie: cookieString,
      }),
    })

    if (!user) {
      console.log('❌ [LEAVE SESSION] User not found')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      console.log('❌ [LEAVE SESSION] No session ID provided')
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    console.log('👤 [LEAVE SESSION] User:', user.id, 'Session:', sessionId)

    // Find the participant record for this user and session
    const participants = await payload.find({
      collection: 'session-participants',
      where: {
        and: [{ session: { equals: Number(sessionId) } }, { user: { equals: user.id } }],
      },
      limit: 1,
    })

    if (participants.totalDocs === 0) {
      console.log('⚠️ [LEAVE SESSION] Participant not found')
      return NextResponse.json(
        { error: 'You are not a participant in this session' },
        { status: 404 },
      )
    }

    const participant = participants.docs[0]
    console.log('📝 [LEAVE SESSION] Found participant:', participant.id)

    // Mark participant as inactive
    await payload.update({
      collection: 'session-participants',
      id: participant.id,
      data: {
        isActive: false,
      },
    })

    // Update session participant count
    const session = await payload.findByID({
      collection: 'course-sessions',
      id: Number(sessionId),
    })

    if (session) {
      const newCount = Math.max(0, (session.participantCount || 1) - 1)
      await payload.update({
        collection: 'course-sessions',
        id: Number(sessionId),
        data: {
          participantCount: newCount,
        },
      })
      console.log('📊 [LEAVE SESSION] Updated participant count:', newCount)
    }

    console.log('✅ [LEAVE SESSION] Successfully left session')

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully left session',
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('❌ [LEAVE SESSION] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to leave session',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
