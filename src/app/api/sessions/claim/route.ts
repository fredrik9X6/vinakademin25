import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-sessions-claim')

/**
 * POST /api/sessions/claim
 *
 * Attaches all guest SessionParticipants whose `email` matches the authed
 * user's email to that user, and re-attributes any reviews those guests
 * submitted (Reviews.user) so they show up in /mina-sidor.
 *
 * Returns counts so the UI can show a "Vi sparade X recensioner till ditt
 * konto" toast.
 *
 * Auth: requires a logged-in user (typically called right after register
 * or login when a `vk_participant_token` cookie is detected).
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const cookieString = request.headers.get('cookie') || ''
    const { user } = await payload.auth({
      headers: new Headers({ Cookie: cookieString }),
    })

    if (!user || !user.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const email = user.email.toLowerCase()

    // Find all guest participants whose email matches and have no user link.
    // (We allow multiple — a guest might have joined several tastings before
    //  creating their account.)
    const guestParticipants = await payload.find({
      collection: 'session-participants',
      where: {
        and: [{ email: { equals: email } }, { user: { exists: false } }],
      },
      limit: 100,
      overrideAccess: true,
    })

    const claimed: number[] = []
    let reviewsClaimed = 0

    for (const p of guestParticipants.docs as any[]) {
      // Attach the user
      await payload.update({
        collection: 'session-participants',
        id: p.id,
        data: { user: user.id },
        overrideAccess: true,
      })
      claimed.push(Number(p.id))

      // Re-attribute any reviews this participant submitted
      const reviewsRes = await payload.find({
        collection: 'reviews',
        where: { sessionParticipant: { equals: p.id } },
        limit: 200,
        overrideAccess: true,
      })

      for (const r of reviewsRes.docs as any[]) {
        // Only set user if it's currently null — don't clobber an existing
        // user attribution (shouldn't happen, but be safe).
        if (!r.user) {
          await payload.update({
            collection: 'reviews',
            id: r.id,
            data: { user: user.id },
            overrideAccess: true,
          })
          reviewsClaimed++
        }
      }
    }

    log.info(
      { userId: user.id, email, participantsClaimed: claimed.length, reviewsClaimed },
      'Guest session data claimed',
    )

    return NextResponse.json(
      {
        success: true,
        participantsClaimed: claimed.length,
        reviewsClaimed,
      },
      { status: 200 },
    )
  } catch (error) {
    log.error({ err: error }, 'Error claiming guest sessions')
    return NextResponse.json(
      {
        error: 'Failed to claim guest sessions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
