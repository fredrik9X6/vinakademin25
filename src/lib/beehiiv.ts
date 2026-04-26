import { loggerFor } from './logger'

const log = loggerFor('lib-beehiiv')

const BEEHIIV_API_BASE = 'https://api.beehiiv.com/v2'

export interface BeehiivSubscribeOptions {
  /** Where the signup came from. Used as utm_medium for Beehiiv reporting. */
  source?:
    | 'footer'
    | 'newsletter_page'
    | 'registration'
    | 'onboarding'
    | 'profile'
    | 'manual'
    | string
  /** Free-form tags applied to the subscription on Beehiiv. */
  tags?: string[]
  /** Whether Beehiiv should send its own welcome email. Default: true. */
  sendWelcomeEmail?: boolean
  /** Whether Beehiiv should reactivate a previously-unsubscribed contact. Default: true (re-opt-in via our flow is intentional). */
  reactivateExisting?: boolean
}

export interface BeehiivSubscribeResult {
  ok: boolean
  beehiivId?: string
  alreadySubscribed?: boolean
  /** True when env vars aren't configured — we soft-no-op so dev environments keep working. */
  skipped?: boolean
  error?: string
}

interface BeehiivConfig {
  apiKey: string
  publicationId: string
}

function getConfig(): BeehiivConfig | null {
  const apiKey = process.env.BEEHIIV_API_KEY
  const publicationId = process.env.BEEHIIV_PUBLICATION_ID
  if (!apiKey || !publicationId) return null
  return { apiKey, publicationId }
}

function authHeaders(cfg: BeehiivConfig): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey}`,
  }
}

/**
 * Subscribe a contact to the publication. Idempotent — Beehiiv handles
 * duplicate emails by returning the existing subscription (with `alreadySubscribed: true`).
 *
 * Returns `skipped: true` when env vars are missing so callers can keep going
 * without an error in development.
 */
export async function subscribe(
  email: string,
  options: BeehiivSubscribeOptions = {},
): Promise<BeehiivSubscribeResult> {
  const cfg = getConfig()
  if (!cfg) {
    log.warn({ email }, 'beehiiv_skipped_no_config')
    return { ok: true, skipped: true }
  }

  const body: Record<string, unknown> = {
    email,
    reactivate_existing: options.reactivateExisting ?? true,
    send_welcome_email: options.sendWelcomeEmail ?? true,
    utm_source: 'vinakademin_website',
    utm_medium: options.source || 'newsletter_signup',
  }

  try {
    const res = await fetch(`${BEEHIIV_API_BASE}/publications/${cfg.publicationId}/subscriptions`, {
      method: 'POST',
      headers: authHeaders(cfg),
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const detail = data?.errors?.[0]?.detail || data?.error || ''
      const alreadySubscribed = String(detail).toLowerCase().includes('already subscribed')
      if (alreadySubscribed) {
        return { ok: true, alreadySubscribed: true }
      }
      log.error({ status: res.status, data }, 'beehiiv_subscribe_failed')
      return { ok: false, error: detail || `HTTP ${res.status}` }
    }

    const beehiivId = data?.data?.id as string | undefined
    if (options.tags && options.tags.length > 0 && beehiivId) {
      // Tags are best-effort. Don't fail the subscribe if tag-update fails.
      void applyTags(beehiivId, options.tags).catch((err) =>
        log.warn({ err, beehiivId }, 'beehiiv_tags_failed'),
      )
    }

    return { ok: true, beehiivId }
  } catch (err) {
    log.error({ err, email }, 'beehiiv_subscribe_exception')
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

export interface BeehiivUnsubscribeResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

/**
 * Mark a contact as unsubscribed in Beehiiv. We use the v2 subscription-status
 * update endpoint via the contact's email; Beehiiv expects either subscription_id
 * or email-based lookup, so we resolve via findByEmail first.
 */
export async function unsubscribe(email: string): Promise<BeehiivUnsubscribeResult> {
  const cfg = getConfig()
  if (!cfg) {
    log.warn({ email }, 'beehiiv_skipped_no_config')
    return { ok: true, skipped: true }
  }

  try {
    const sub = await findByEmail(email)
    if (!sub.ok || !sub.beehiivId) {
      // No record on Beehiiv — nothing to unsubscribe.
      return { ok: true }
    }

    const res = await fetch(
      `${BEEHIIV_API_BASE}/publications/${cfg.publicationId}/subscriptions/${sub.beehiivId}`,
      {
        method: 'PATCH',
        headers: authHeaders(cfg),
        body: JSON.stringify({ unsubscribe: true }),
      },
    )

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      log.error({ status: res.status, data }, 'beehiiv_unsubscribe_failed')
      return { ok: false, error: data?.errors?.[0]?.detail || `HTTP ${res.status}` }
    }

    return { ok: true }
  } catch (err) {
    log.error({ err, email }, 'beehiiv_unsubscribe_exception')
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

export interface BeehiivFindResult {
  ok: boolean
  beehiivId?: string
  status?: string
  skipped?: boolean
  error?: string
}

/** Look up a subscription by email. Returns `ok: true` with no `beehiivId` if not found. */
export async function findByEmail(email: string): Promise<BeehiivFindResult> {
  const cfg = getConfig()
  if (!cfg) return { ok: true, skipped: true }

  try {
    const res = await fetch(
      `${BEEHIIV_API_BASE}/publications/${cfg.publicationId}/subscriptions?email=${encodeURIComponent(email)}`,
      { method: 'GET', headers: authHeaders(cfg) },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      log.error({ status: res.status, data }, 'beehiiv_find_failed')
      return { ok: false, error: data?.errors?.[0]?.detail || `HTTP ${res.status}` }
    }
    const first = Array.isArray(data?.data) ? data.data[0] : data?.data
    return { ok: true, beehiivId: first?.id, status: first?.status }
  } catch (err) {
    log.error({ err, email }, 'beehiiv_find_exception')
    return { ok: false, error: err instanceof Error ? err.message : 'unknown error' }
  }
}

async function applyTags(beehiivId: string, tags: string[]): Promise<void> {
  const cfg = getConfig()
  if (!cfg) return
  await fetch(
    `${BEEHIIV_API_BASE}/publications/${cfg.publicationId}/subscriptions/${beehiivId}`,
    {
      method: 'PATCH',
      headers: authHeaders(cfg),
      body: JSON.stringify({ tags }),
    },
  )
}

export function isBeehiivConfigured(): boolean {
  return getConfig() !== null
}
