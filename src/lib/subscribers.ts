import type { Payload } from 'payload'
import { loggerFor } from './logger'
import { subscribe as beehiivSubscribe, unsubscribe as beehiivUnsubscribe } from './beehiiv'

const log = loggerFor('lib-subscribers')

type Source =
  | 'footer'
  | 'newsletter_page'
  | 'registration'
  | 'onboarding'
  | 'profile'
  | 'manual'

interface UpsertInput {
  payload: Payload
  email: string
  source: Source
  relatedUserId?: number | string | null
  tags?: string[]
}

/**
 * Subscribe an email to Beehiiv AND mirror the row in our local Subscribers
 * collection. Idempotent — safe to call multiple times for the same email.
 *
 * Never throws — failures are logged and the function returns a result object
 * so callers can decide whether to surface anything to the user.
 */
export async function subscribeAndMirror(input: UpsertInput): Promise<{
  ok: boolean
  alreadySubscribed?: boolean
  beehiivSkipped?: boolean
  error?: string
}> {
  const { payload, email, source, relatedUserId, tags } = input

  // 1) Push to Beehiiv first; we want the canonical beehiivId before the local write.
  const beehiivResult = await beehiivSubscribe(email, {
    source,
    tags: ['user', source].filter(Boolean) as string[],
  })

  // 2) Upsert local Subscribers row regardless of Beehiiv outcome — we want a
  //    local audit trail even if Beehiiv is down or unconfigured.
  try {
    const existing = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
    })

    const baseData: Record<string, unknown> = {
      email,
      status: 'subscribed',
      source,
      subscribedAt: new Date().toISOString(),
      unsubscribedAt: null,
      ...(beehiivResult.beehiivId ? { beehiivId: beehiivResult.beehiivId } : {}),
      ...(relatedUserId ? { relatedUser: relatedUserId } : {}),
      ...(tags && tags.length > 0 ? { tags: tags.map((value) => ({ value })) } : {}),
      lastSyncError: beehiivResult.ok ? null : beehiivResult.error || null,
    }

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'subscribers',
        id: existing.docs[0].id,
        data: baseData,
      })
    } else {
      await payload.create({
        collection: 'subscribers',
        data: baseData,
      })
    }
  } catch (err) {
    log.error({ err, email }, 'subscribers_local_upsert_failed')
  }

  return {
    ok: beehiivResult.ok,
    alreadySubscribed: beehiivResult.alreadySubscribed,
    beehiivSkipped: beehiivResult.skipped,
    error: beehiivResult.error,
  }
}

/**
 * Mark a contact as unsubscribed in Beehiiv and in our local Subscribers row.
 * Never throws.
 */
export async function unsubscribeAndMirror(input: {
  payload: Payload
  email: string
}): Promise<{ ok: boolean; error?: string }> {
  const { payload, email } = input

  const beehiivResult = await beehiivUnsubscribe(email)

  try {
    const existing = await payload.find({
      collection: 'subscribers',
      where: { email: { equals: email } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      await payload.update({
        collection: 'subscribers',
        id: existing.docs[0].id,
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date().toISOString(),
          lastSyncError: beehiivResult.ok ? null : beehiivResult.error || null,
        },
      })
    }
  } catch (err) {
    log.error({ err, email }, 'subscribers_local_unsubscribe_failed')
  }

  return { ok: beehiivResult.ok, error: beehiivResult.error }
}

/** Best-effort lookup so we can attach `relatedUser` when an email matches a User. */
export async function findUserIdByEmail(payload: Payload, email: string): Promise<number | null> {
  try {
    const res = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
    })
    if (res.docs.length === 0) return null
    return res.docs[0].id as unknown as number
  } catch (err) {
    log.error({ err, email }, 'subscribers_find_user_failed')
    return null
  }
}
