import { NextRequest, NextResponse } from 'next/server'
import { getStripeServer, getOrCreateStripeCustomer } from '@/lib/stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { getUser } from '@/lib/get-user'
import { getSiteURL } from '@/lib/site-url'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('api-payments-template-checkout')

/**
 * Create a Stripe Checkout Session for a tasting template purchase.
 * The Stripe webhook (payment_intent.succeeded handler) reads
 * metadata.productKind === 'template' and creates a TemplateEntitlements row.
 *
 * Auth-gated: anonymous users get bounced through /logga-in?next=/kop in the
 * UI. This endpoint enforces login independently as defense in depth.
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.4)
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
