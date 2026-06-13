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
export async function POST(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Du måste vara inloggad för att köpa en provningsmall' },
        { status: 401 },
      )
    }

    const { templateId } = (await request.json()) as { templateId?: string | number }
    if (!templateId) {
      return NextResponse.json({ error: 'Provningsmall-ID krävs' }, { status: 400 })
    }

    const payload = await getPayload({ config })
    const template = await payload.findByID({
      collection: 'tasting-templates',
      id: String(templateId),
      depth: 1,
      overrideAccess: true,
    })

    if (!template) {
      return NextResponse.json({ error: 'Provningsmallen hittades inte' }, { status: 404 })
    }

    if ((template as { publishedStatus?: string }).publishedStatus !== 'published') {
      return NextResponse.json({ error: 'Mallen är inte publicerad' }, { status: 400 })
    }

    if ((template as { accessLevel?: string }).accessLevel !== 'paid') {
      return NextResponse.json(
        { error: 'Den här mallen är inte tillgänglig för köp' },
        { status: 400 },
      )
    }

    const priceSek = (template as { priceSek?: number }).priceSek
    if (typeof priceSek !== 'number' || priceSek <= 0) {
      return NextResponse.json({ error: 'Mallen saknar pris' }, { status: 400 })
    }

    // Already-owned check — short-circuit before hitting Stripe
    const existing = await payload.find({
      collection: 'template-entitlements',
      where: {
        and: [
          { user: { equals: user.id } },
          { template: { equals: templateId } },
          { status: { equals: 'active' } },
        ],
      },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.totalDocs > 0) {
      return NextResponse.json(
        { error: 'Du äger redan denna provningsmall' },
        { status: 400 },
      )
    }

    const customer = await getOrCreateStripeCustomer(
      user.email!,
      String(user.id),
      `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    )

    const stripe = getStripeServer()
    const baseUrl = getSiteURL()
    const slug = (template as { slug?: string }).slug || String(templateId)
    const title = (template as { title?: string }).title || 'Provningsmall'

    const featured = (template as { featuredImage?: { url?: string | null } | string | number | null }).featuredImage
    const imageUrl =
      featured && typeof featured === 'object' && featured.url
        ? featured.url.startsWith('http')
          ? featured.url
          : `${baseUrl}${featured.url}`
        : null

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card', 'klarna'],
      line_items: [
        {
          price_data: {
            currency: 'sek',
            product_data: {
              name: title,
              description: `Provningsmall: ${title}`,
              images: imageUrl ? [imageUrl] : [],
              metadata: {
                templateId: String(templateId),
                productKind: 'template',
              },
            },
            unit_amount: Math.round(priceSek * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${baseUrl}/provningsmallar/${slug}?purchase=success`,
      cancel_url: `${baseUrl}/provningsmallar/${slug}?purchase=cancelled`,
      metadata: {
        productKind: 'template',
        templateId: String(templateId),
        templateTitle: title,
        userId: String(user.id),
        userEmail: user.email || '',
      },
      // Push the same metadata to the resulting PaymentIntent so the
      // payment_intent.succeeded webhook can branch on productKind without
      // having to look up the checkout session.
      payment_intent_data: {
        metadata: {
          productKind: 'template',
          templateId: String(templateId),
          userId: String(user.id),
        },
      },
      automatic_tax: { enabled: true },
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      consent_collection: { terms_of_service: 'required' },
      customer_update: { address: 'auto', name: 'auto' },
    })

    log.info(
      { templateId, userId: user.id, sessionId: session.id, priceSek },
      'template_checkout_created',
    )

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err) {
    log.error('template_checkout_error', err)
    return NextResponse.json(
      { error: 'Ett fel uppstod vid skapande av betalning' },
      { status: 500 },
    )
  }
}
