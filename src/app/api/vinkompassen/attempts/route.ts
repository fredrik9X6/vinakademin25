import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { headers as nextHeaders } from 'next/headers'
import { loggerFor } from '@/lib/logger'
import { scoreAttempt } from '@/lib/vinkompassen/scoring'
import { generateAttemptId } from '@/lib/vinkompassen/attempt-id'
import type { AnswerInput } from '@/lib/vinkompassen/types'
import { subscribeAndMirror, findUserIdByEmail } from '@/lib/subscribers'
import { getUser } from '@/lib/get-user'

const log = loggerFor('api-vinkompassen-attempts')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const answers: AnswerInput[] = Array.isArray(body?.answers) ? body.answers : []

    if (answers.length === 0) {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Load questions referenced by the submission. We do NOT trust the
    // client-supplied scores — we recompute from the canonical question docs.
    const questionIds = Array.from(new Set(answers.map((a) => a.questionId)))
    const questionsRes = await payload.find({
      collection: 'vinkompass-questions',
      where: { id: { in: questionIds } },
      limit: 100,
      depth: 0,
    })

    if (questionsRes.docs.length !== questionIds.length) {
      return NextResponse.json({ error: 'Unknown questionId in submission' }, { status: 400 })
    }

    let scored
    try {
      scored = scoreAttempt(questionsRes.docs, answers)
    } catch (err) {
      log.warn({ err }, 'vinkompassen_score_invalid')
      return NextResponse.json({ error: 'Invalid answer payload' }, { status: 400 })
    }

    // Resolve archetype by `key`
    const archetypeRes = await payload.find({
      collection: 'vinkompass-archetypes',
      where: { key: { equals: scored.quadrant } },
      limit: 1,
      depth: 0,
    })
    const archetype = archetypeRes.docs[0]
    if (!archetype) {
      log.error({ quadrant: scored.quadrant }, 'vinkompassen_archetype_missing')
      return NextResponse.json({ error: 'Archetype not configured' }, { status: 500 })
    }

    const attemptId = generateAttemptId()
    const headers = await nextHeaders()
    const userAgent = headers.get('user-agent') || ''
    const referer = headers.get('referer') || ''

    // Logged-in users — auto-subscribe with their email and skip the gate
    const currentUser = await getUser().catch(() => null)
    const userEmail = currentUser?.email?.trim().toLowerCase() || null

    const created = await payload.create({
      collection: 'vinkompass-attempts',
      data: {
        attemptId,
        answers: answers.map((a) => ({ questionId: a.questionId, answerIndex: a.answerIndex })),
        scoreBody: scored.scoreBody,
        scoreComfort: scored.scoreComfort,
        archetype: archetype.id,
        userId: currentUser?.id || null,
        email: userEmail,
        emailSubmittedAt: userEmail ? new Date().toISOString() : null,
        userAgent,
        referer,
      },
    })

    if (userEmail) {
      // Fire-and-forget; do not block the response on Beehiiv
      void (async () => {
        try {
          const tags = ['vinkompassen', archetype.beehiivTag].filter(Boolean)
          const relatedUserId = await findUserIdByEmail(payload, userEmail)
          await subscribeAndMirror({
            payload,
            email: userEmail,
            source: 'vinkompassen',
            relatedUserId,
            tags,
          })
          // Backfill subscriberId on the Attempt so the CRM join works
          // for logged-in users (the email-gate route does this for
          // anonymous users at submit time).
          const subscriberRes = await payload.find({
            collection: 'subscribers',
            where: { email: { equals: userEmail } },
            limit: 1,
            depth: 0,
          })
          const subscriberId = subscriberRes.docs[0]?.id ?? null
          if (subscriberId) {
            await payload.update({
              collection: 'vinkompass-attempts',
              id: created.id,
              data: { subscriberId },
            })
          }
        } catch (err) {
          log.warn({ err }, 'vinkompassen_loggedin_subscribe_failed')
        }
      })()
    }

    return NextResponse.json(
      { ok: true, attemptId: created.attemptId, quadrant: scored.quadrant },
      { status: 200 },
    )
  } catch (err) {
    log.error({ err }, 'vinkompassen_create_attempt_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
