import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { loggerFor } from '@/lib/logger'
import { subscribeAndMirror, findUserIdByEmail } from '@/lib/subscribers'
import type { VinkompassArchetype } from '@/payload-types'

const log = loggerFor('api-vinkompassen-email')

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await ctx.params
    const body = await request.json().catch(() => ({}))
    const email: string = String(body?.email || '').trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Giltig e-postadress krävs' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    const attemptRes = await payload.find({
      collection: 'vinkompass-attempts',
      where: { attemptId: { equals: attemptId } },
      limit: 1,
      depth: 1, // populate `archetype`
    })
    const attempt = attemptRes.docs[0]
    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // Idempotency: don't allow overwriting a submitted email
    if (attempt.email) {
      return NextResponse.json({ ok: true, alreadySubmitted: true }, { status: 200 })
    }

    const archetype = attempt.archetype as VinkompassArchetype
    const beehiivTag = archetype?.beehiivTag || ''
    const tags = ['vinkompassen', beehiivTag].filter(Boolean)
    const relatedUserId = await findUserIdByEmail(payload, email)

    const subResult = await subscribeAndMirror({
      payload,
      email,
      source: 'vinkompassen',
      relatedUserId,
      tags,
    })

    if (!subResult.ok && !subResult.alreadySubscribed && !subResult.beehiivSkipped) {
      log.error({ email, err: subResult.error }, 'vinkompassen_subscribe_failed')
      return NextResponse.json(
        { error: 'Kunde inte spara prenumerationen. Försök igen.' },
        { status: 500 },
      )
    }

    // Look up the local Subscribers row to attach to the Attempt
    const subscriberRes = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
    })
    const subscriberId = subscriberRes.docs[0]?.id || null

    await payload.update({
      collection: 'vinkompass-attempts',
      id: attempt.id,
      data: {
        email,
        emailSubmittedAt: new Date().toISOString(),
        subscriberId,
      },
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    log.error({ err }, 'vinkompassen_email_submit_failed')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
