import type { Payload } from 'payload'
import { loggerFor } from './logger'
import { subscribe as beehiivSubscribe, unsubscribe as beehiivUnsubscribe } from './beehiiv'
import { recordEvent } from './events'

const log = loggerFor('lib-subscribers')

export type Source =
  | 'footer'
  | 'newsletter_page'
  | 'registration'
  | 'onboarding'
  | 'profile'
  | 'manual'
  | 'vinkompassen'

export const SOURCES = [
  'footer',
  'newsletter_page',
  'registration',
  'onboarding',
  'profile',
  'manual',
  'vinkompassen',
] as const satisfies readonly Source[]

export type LeadMagnetType = 'ebook' | 'quiz' | 'webinar' | 'video' | 'download' | 'template'

export const LEAD_MAGNET_TYPES = [
  'ebook',
  'quiz',
  'webinar',
  'video',
  'download',
  'template',
] as const satisfies readonly LeadMagnetType[]

export interface LeadMagnetRef {
  type: LeadMagnetType
  slug: string
}

interface UpsertInput {
  payload: Payload
  email: string
  source: Source
  relatedUserId?: number | string | null
  tags?: string[]
  leadMagnet?: LeadMagnetRef
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
  const { payload, email, source, relatedUserId, tags, leadMagnet } = input

  // Tags forwarded to Beehiiv. Lead-magnet signups get three layered tags so you
  // can segment by "any lead magnet", "any of this type" (e.g. all ebooks), or
  // "this specific magnet" without crafting boolean filters.
  const leadMagnetTags = leadMagnet
    ? ['lead_magnet', `lead_magnet:${leadMagnet.type}`, `lead_magnet:${leadMagnet.type}:${leadMagnet.slug}`]
    : []
  const beehiivTags = ['user', source, ...leadMagnetTags, ...(tags ?? [])].filter(Boolean) as string[]

  // 1) Push to Beehiiv first; we want the canonical beehiivId before the local write.
  const beehiivResult = await beehiivSubscribe(email, {
    source,
    tags: beehiivTags,
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
      ...(leadMagnet ? { leadMagnet: { type: leadMagnet.type, slug: leadMagnet.slug } } : {}),
      lastSyncError: beehiivResult.ok ? null : beehiivResult.error || null,
    }

    let subscriberId: number | string | null = null
    if (existing.docs.length > 0) {
      const updated = await payload.update({
        collection: 'subscribers',
        id: existing.docs[0].id,
        data: baseData,
      })
      subscriberId = updated.id
    } else {
      const created = await payload.create({
        collection: 'subscribers',
        data: baseData,
      })
      subscriberId = created.id
    }

    // Append to the CRM timeline. Skip when this was a no-op re-subscribe of
    // an already-subscribed address (avoid noise when users repeatedly hit the form).
    if (!beehiivResult.alreadySubscribed) {
      await recordEvent({
        payload,
        type: 'newsletter_subscribed',
        contactEmail: email,
        label: `Subscribed via ${source}`,
        userId: relatedUserId ?? null,
        subscriberId,
        source: 'system',
        metadata: {
          beehiivId: beehiivResult.beehiivId,
          beehiivSkipped: !!beehiivResult.skipped,
          source,
          ...(leadMagnet ? { leadMagnetType: leadMagnet.type, leadMagnetSlug: leadMagnet.slug } : {}),
        },
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

    let subscriberId: number | string | null = null
    let relatedUserId: number | string | null = null
    if (existing.docs.length > 0) {
      const updated = await payload.update({
        collection: 'subscribers',
        id: existing.docs[0].id,
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date().toISOString(),
          lastSyncError: beehiivResult.ok ? null : beehiivResult.error || null,
        },
      })
      subscriberId = updated.id
      const rel = (updated as any).relatedUser
      relatedUserId = typeof rel === 'object' ? rel?.id ?? null : rel ?? null
    }

    await recordEvent({
      payload,
      type: 'newsletter_unsubscribed',
      contactEmail: email,
      label: 'Unsubscribed from newsletter',
      userId: relatedUserId,
      subscriberId,
      source: 'system',
    })
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
