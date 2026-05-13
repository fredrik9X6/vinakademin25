import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { loggerFor } from '@/lib/logger'
import type { SessionParticipant } from '@/payload-types'
import { PARTICIPANT_COOKIE, PARTICIPANT_COOKIE_MAX_AGE_SECONDS } from '@/lib/sessions'

const log = loggerFor('api-sessions-join')

function generateParticipantToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * POST /api/sessions/join
 *
 * Joins a session by code. Both authenticated users and anonymous guests
 * are supported.
 *
 * Body:
 * - joinCode: string (required)
 * - nickname?: string (required for guests, ignored for authed users)
 * - email?: string (optional; used for the post-tasting account-claim flow)
 *
 * On success: returns participant + session info AND sets an httpOnly
 * cookie `vk_participant_token` so subsequent reads on /api/sessions/[id]
 * can identify the participant without query-param plumbing.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({ Cookie: cookieString }),
    })

    const body = await request.json().catch(() => ({}))
    const { joinCode, nickname: nicknameRaw, email: emailRaw } = body as {
      joinCode?: string
      nickname?: string
      email?: string
    }

    if (!joinCode || typeof joinCode !== 'string') {
      return NextResponse.json({ error: 'joinCode is required' }, { status: 400 })
    }

    const nickname = typeof nicknameRaw === 'string' ? nicknameRaw.trim().slice(0, 50) : ''
    const email =
      typeof emailRaw === 'string' && emailRaw.trim() ? emailRaw.trim().toLowerCase() : null

    // Guests must supply a nickname; authed users default to their account name
    if (!user && !nickname) {
      return NextResponse.json(
        { error: 'Ange ett namn för att gå med som gäst.' },
        { status: 400 },
      )
    }

    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Ange en giltig e-postadress.' }, { status: 400 })
    }

    // NOTE: These eligibility checks duplicate the read-only logic in
    // `lookupSessionByCode` (src/lib/sessions.ts). When changing what counts
    // as joinable (status, expiry, full, etc.), update both. A future
    // refactor could have this route call the helper and re-fetch the
    // session doc for the mutation phase.
    // Find session by join code
    const sessionResult = await payload.find({
      collection: 'course-sessions',
      where: { joinCode: { equals: joinCode.toUpperCase() } },
      limit: 1,
    })

    if (sessionResult.totalDocs === 0) {
      return NextResponse.json({ error: 'Sessionen hittades inte' }, { status: 404 })
    }

    const session = sessionResult.docs[0]

    if (session.status !== 'active') {
      return NextResponse.json({ error: 'Sessionen är inte aktiv' }, { status: 400 })
    }

    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Sessionen har gått ut' }, { status: 400 })
    }

    const currentParticipants = Number(session.participantCount ?? 0)
    const maxParticipants =
      session.maxParticipants !== null && session.maxParticipants !== undefined
        ? Number(session.maxParticipants)
        : null

    if (maxParticipants !== null && currentParticipants >= maxParticipants) {
      return NextResponse.json({ error: 'Sessionen är full' }, { status: 400 })
    }

    let participant: SessionParticipant | null = null
    let isNewJoin = false

    if (user) {
      // Authed re-join: reactivate existing participant if present
      const existing = await payload.find({
        collection: 'session-participants',
        where: {
          and: [{ session: { equals: session.id } }, { user: { equals: user.id } }],
        },
        limit: 1,
      })

      if (existing.totalDocs > 0) {
        participant = existing.docs[0]
        if (!participant.isActive) {
          participant = await payload.update({
            collection: 'session-participants',
            id: participant.id,
            data: { isActive: true, lastActivityAt: new Date().toISOString() },
          })
        }
      } else {
        const displayName =
          (user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.lastName || user.email?.split('@')[0]) || 'Anonym'
        participant = await payload.create({
          collection: 'session-participants',
          data: {
            session: session.id,
            user: user.id,
            nickname: displayName,
            email: user.email?.toLowerCase() || undefined,
            participantToken: generateParticipantToken(),
            isActive: true,
            lastActivityAt: new Date().toISOString(),
          },
        })
        isNewJoin = true
      }
    } else {
      // Guest re-join: try to recover via existing cookie token
      const cookieStore = await cookies()
      const existingToken = cookieStore.get(PARTICIPANT_COOKIE)?.value
      let recovered = false
      if (existingToken) {
        const recoveredRes = await payload.find({
          collection: 'session-participants',
          where: {
            and: [
              { session: { equals: session.id } },
              { participantToken: { equals: existingToken } },
            ],
          },
          limit: 1,
        })
        if (recoveredRes.totalDocs > 0) {
          participant = recoveredRes.docs[0]
          if (!participant.isActive) {
            participant = await payload.update({
              collection: 'session-participants',
              id: participant.id,
              data: { isActive: true, lastActivityAt: new Date().toISOString() },
            })
          }
          recovered = true
        }
      }

      if (!recovered) {
        participant = await payload.create({
          collection: 'session-participants',
          data: {
            session: session.id,
            nickname,
            email: email || undefined,
            participantToken: generateParticipantToken(),
            isActive: true,
            lastActivityAt: new Date().toISOString(),
          },
        })
        isNewJoin = true
      }
    }

    if (!participant) {
      // Should be unreachable given the branches above, but keeps TS honest
      return NextResponse.json({ error: 'Failed to attach participant' }, { status: 500 })
    }

    if (isNewJoin) {
      await payload.update({
        collection: 'course-sessions',
        id: session.id,
        data: { participantCount: (session.participantCount || 0) + 1 },
      })
    }

    // Polymorphic: course-driven OR plan-driven session.
    const courseId =
      session.course == null
        ? null
        : typeof session.course === 'object'
        ? session.course.id
        : session.course
    const planId =
      session.tastingPlan == null
        ? null
        : typeof session.tastingPlan === 'object'
        ? session.tastingPlan.id
        : session.tastingPlan

    const course = courseId
      ? await payload.findByID({ collection: 'vinprovningar', id: courseId })
      : null
    const plan = planId
      ? await payload.findByID({
          collection: 'tasting-plans',
          id: planId,
          overrideAccess: true,
        })
      : null

    const response = NextResponse.json(
      {
        success: true,
        participant: {
          id: participant.id,
          nickname: participant.nickname,
          participantToken: participant.participantToken,
          isGuest: !user,
        },
        user: user
          ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            }
          : null,
        session: {
          id: session.id,
          sessionName: session.sessionName,
          course: course
            ? { id: course.id, title: course.title, slug: course.slug }
            : null,
          tastingPlan: plan ? { id: plan.id, title: plan.title } : null,
          currentActivity: session.currentActivity,
          currentLesson: session.currentLesson,
          currentQuiz: session.currentQuiz,
          expiresAt: session.expiresAt,
        },
      },
      { status: 200 },
    )

    response.cookies.set(PARTICIPANT_COOKIE, participant.participantToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: PARTICIPANT_COOKIE_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    log.error('Error joining session:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
