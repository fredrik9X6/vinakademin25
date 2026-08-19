import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { getSiteURL } from '@/lib/site-url'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-payments-template-checkout')

/**
 * Retired endpoint: template checkout.
 *
 * Templates transitioned to a free lead magnet on 2026-08-19. This endpoint
 * unconditionally returns 410 Gone. Kept rather than deleted so it can be
 * revived if needed.
 *
 * Imports (NextRequest, getStripeServer, getOrCreateStripeCustomer, getPayload,
 * config, getUser, getSiteURL) are intentionally retained for potential revival
 * without requiring a separate import-restoration commit.
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.3)
 */
export async function POST(): Promise<NextResponse> {
  // Templates are free since 2026-08-19 (lead magnet). Kept as 410 rather than
  // deleted so the route can be revived; see the design spec, Section 1.3.
  log.warn('template-checkout called after templates went free — refusing')
  return NextResponse.json(
    { error: 'Provningsmallar är gratis — inget köp behövs.' },
    { status: 410 },
  )
}
