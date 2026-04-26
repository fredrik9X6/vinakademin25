import type { Payload } from 'payload'
import { loggerFor } from './logger'

const log = loggerFor('lib-events')

export type EventType =
  | 'newsletter_subscribed'
  | 'newsletter_unsubscribed'
  | 'account_created'
  | 'account_verified'
  | 'onboarding_completed'
  | 'marketing_opt_in_changed'
  | 'order_paid'
  | 'order_refunded'
  | 'enrollment_started'
  | 'course_completed'
  | 'quiz_passed'
  | 'review_submitted'
  | 'wine_added_to_list'
  | 'login'

export type EventSource = 'web' | 'webhook' | 'system' | 'cron' | 'manual'

export interface RecordEventInput {
  payload: Payload
  type: EventType
  contactEmail: string
  label: string
  userId?: number | string | null
  subscriberId?: number | string | null
  metadata?: Record<string, unknown>
  source?: EventSource
}

/**
 * Append a row to the CRM timeline. Never throws — failures are logged and
 * swallowed so a write blip can't break user-facing flows.
 */
export async function recordEvent(input: RecordEventInput): Promise<void> {
  const {
    payload,
    type,
    contactEmail,
    label,
    userId,
    subscriberId,
    metadata,
    source = 'system',
  } = input

  if (!contactEmail) {
    log.warn({ type, label }, 'event_missing_contact_email')
    return
  }

  try {
    await payload.create({
      collection: 'events',
      data: {
        type,
        contactEmail: contactEmail.trim().toLowerCase(),
        label,
        ...(userId ? { user: userId as number } : {}),
        ...(subscriberId ? { subscriber: subscriberId as number } : {}),
        ...(metadata ? { metadata } : {}),
        source,
      },
    })
  } catch (err) {
    log.error({ err, type, contactEmail }, 'event_record_failed')
  }
}
