import { getStripeServer, STRIPE_CONFIG, formatAmountForStripe } from './stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Vinkurser } from '@/payload-types'
import { loggerFor } from '@/lib/logger'

const log = loggerFor('lib-stripe-products')

// Types for Stripe product management
export interface StripeProductData {
  id: string
  name: string
  description?: string
  images?: string[]
  metadata: {
    courseId: string
    type: 'course' | 'subscription'
  }
}

export interface StripePriceData {
  id: string
  product: string
  unit_amount: number
  currency: string
  metadata: {
    courseId?: string
    planType?: string
  }
}

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripePriceId?: string
  stripeProductId?: string
}

/**
 * The "Vinakademin Premium" digital membership tier — single all-you-can-taste
 * subscription that unlocks members-only TastingTemplates.
 *
 * Created in Stripe by scripts/setup-stripe-premium.ts (idempotent). The
 * resulting price ids land in env vars below.
 */
export const VINAKADEMIN_PREMIUM = {
  productKey: 'vinakademin_premium',
  productName: 'Vinakademin Premium',
  productDescription:
    'Tillgång till alla provningsmallar i biblioteket samt verktyg för att hosta egna provningar.',
  monthly: {
    planId: 'monthly' as const,
    amountSek: 99,
    nickname: 'Premium - Månadsvis',
    envVar: 'STRIPE_PREMIUM_MONTHLY_PRICE_ID',
  },
  yearly: {
    planId: 'annual' as const,
    amountSek: 990,
    nickname: 'Premium - Årlig',
    envVar: 'STRIPE_PREMIUM_YEARLY_PRICE_ID',
  },
  features: [
    'Tillgång till alla provningsmallar i biblioteket',
    'Obegränsat antal egna provningar',
    'Hosta provningar med fler än 4 deltagare',
    'Avancerade funktioner — live-poäng, blind-gissning, recap',
    'Förtur till nya släpp och erbjudanden',
  ],
} as const

export function getPremiumMonthlyPriceId(): string | null {
  return process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || null
}

export function getPremiumYearlyPriceId(): string | null {
  return process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID || null
}

export function isPremiumPriceId(priceId: string): 'monthly' | 'annual' | null {
  if (priceId === process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID) return 'monthly'
  if (priceId === process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID) return 'annual'
  return null
}

// Pre-defined subscription plans for wine club memberships
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'wine_club_monthly',
    name: 'Vinprenumeration - Månadsvis',
    description: 'Månadsvis vinprenumeration med kurater viner och exklusiva vinprovningar',
    price: 499, // SEK
    interval: 'month',
    features: [
      '2 kurerade viner per månad',
      'Exklusiv tillgång till nya vinprovningar',
      'Månatliga vinprovningar',
      'Personlig vinrådgivning',
      'Medlemsrabatter på vinprovningar',
    ],
  },
  {
    id: 'wine_club_yearly',
    name: 'Vinprenumeration - Årlig',
    description: 'Årlig vinprenumeration med extra förmåner och rabatt',
    price: 4990, // SEK (equivalent to ~10 months, 2 months free)
    interval: 'year',
    features: [
      '24 kurerade viner per år',
      'Exklusiv tillgång till alla vinprovningar',
      'Månatliga vinprovningar',
      'Personlig vinrådgivning',
      '20% rabatt på alla vinprovningar',
      'Exklusiva årliga events',
      '2 månader gratis',
    ],
  },
]

/**
 * Sync a PayloadCMS course with Stripe product
 * @param courseId - The ID of the course to sync
 * @param courseData - Optional course data to use directly (avoids re-fetching from DB)
 */
export async function syncCourseWithStripe(
  courseId: string,
  courseData?: Partial<Vinkurser>
): Promise<{
  productId: string
  priceId: string
}> {
  const payload = await getPayload({ config })

  let course: Vinkurser

  if (courseData?.title && courseData?.price !== undefined) {
    // Use provided course data directly (avoids race conditions with DB)
    course = courseData as Vinkurser
    log.info(`Using provided course data for Stripe sync: title="${course.title}"`)
  } else {
    // Fetch course from PayloadCMS with overrideAccess to bypass access control
    // Use draft: false to ensure we get the published version with all fields
    course = (await payload.findByID({
      collection: 'vinkurser',
      id: courseId,
      overrideAccess: true, // Bypass access control
      draft: false, // Get the published version, not draft
    })) as Vinkurser

    if (!course) {
      throw new Error(`Course with ID ${courseId} not found`)
    }

    log.info(`Fetched course data for Stripe sync: title="${course.title}", id=${course.id}`)
  }

  // Validate required fields before calling Stripe
  if (!course.title || course.title.trim() === '') {
    throw new Error(
      `Cannot sync course ${courseId} with Stripe: title is required but was empty. ` +
        `Please ensure the wine tasting has a title before publishing.`
    )
  }

  const courseTitle = course.title.trim()
  const courseDescription = course.description?.trim() || `Wine course: ${courseTitle}`

  // Create or update Stripe product
  const productData: any = {
    name: courseTitle,
    description: courseDescription,
    metadata: {
      courseId: String(courseId),
      type: 'course',
    },
  }

  // Add course image if available
  if (
    course.featuredImage &&
    typeof course.featuredImage === 'object' &&
    course.featuredImage.url
  ) {
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    productData.images = [
      course.featuredImage.url.startsWith('http')
        ? course.featuredImage.url
        : `${baseUrl}${course.featuredImage.url}`,
    ]
  }

  let product

  // Check if product already exists in Stripe
  const stripe = getStripeServer()
  if (course.stripeProductId) {
    try {
      product = await stripe.products.update(course.stripeProductId, productData)
    } catch (error) {
      log.error(`Failed to update Stripe product ${course.stripeProductId}:`, error)
      // If update fails, create new product
      product = await stripe.products.create(productData)
    }
  } else {
    product = await stripe.products.create(productData)
  }

  // Create or update price
  const priceAmount = formatAmountForStripe(course.price || 0)

  let price
  if (course.stripePriceId) {
    try {
      // Stripe prices are immutable, so we need to create a new one and archive the old
      await stripe.prices.update(course.stripePriceId, { active: false })
    } catch (error) {
      log.error(`Failed to archive old price ${course.stripePriceId}:`, error)
    }
  }

  // Create new price
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceAmount,
    currency: STRIPE_CONFIG.currency,
    metadata: {
      courseId: String(courseId),
    },
  })

  // Update course in PayloadCMS with Stripe IDs
  // Use overrideAccess to bypass access control
  // Fetch fresh document first, then update with merged data to avoid validation issues
  try {
    // First, fetch the complete document to ensure we have all required fields
    const existingDoc = await payload.findByID({
      collection: 'vinkurser',
      id: courseId,
      overrideAccess: true,
      depth: 0, // Don't populate relationships to avoid serialization issues
    })

    if (!existingDoc) {
      log.error(`Could not find course ${courseId} to update Stripe IDs`)
      return { productId: product.id, priceId: price.id }
    }

    // Update with the Stripe IDs
    await payload.update({
      collection: 'vinkurser',
      id: courseId,
      data: {
        stripeProductId: product.id,
        stripePriceId: price.id,
      },
      overrideAccess: true,
      // Don't use draft: true as we want to update the published version
    })
    
    log.info(`Successfully updated course ${courseId} with Stripe IDs`)
  } catch (updateError: any) {
    // Log the error but don't throw - Stripe product/price were created successfully
    // The IDs will be synced on next save, or can be manually added
    log.error(`Failed to save Stripe IDs to course ${courseId}:`, updateError.message)
    log.info(`Stripe Product ID: ${product.id}`)
    log.info(`Stripe Price ID: ${price.id}`)
    log.info('These IDs were created successfully in Stripe but could not be saved to the database.')
    log.info('They will be synced on next course update, or can be manually added in the admin panel.')
  }

  return {
    productId: product.id,
    priceId: price.id,
  }
}

/**
 * Create or update subscription plans in Stripe
 */
export async function syncSubscriptionPlans(): Promise<
  Record<string, { productId: string; priceId: string }>
> {
  const stripe = getStripeServer()
  const results: Record<string, { productId: string; priceId: string }> = {}

  for (const plan of SUBSCRIPTION_PLANS) {
    // Create Stripe product for subscription
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        planId: plan.id,
        type: 'subscription',
      },
    })

    // Create Stripe price for subscription
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: formatAmountForStripe(plan.price),
      currency: STRIPE_CONFIG.currency,
      recurring: {
        interval: plan.interval,
      },
      metadata: {
        planType: plan.id,
      },
    })

    results[plan.id] = {
      productId: product.id,
      priceId: price.id,
    }

    // Update plan with Stripe IDs
    plan.stripeProductId = product.id
    plan.stripePriceId = price.id
  }

  return results
}

/**
 * Get all courses and sync them with Stripe
 */
export async function syncAllCoursesWithStripe(): Promise<void> {
  const payload = await getPayload({ config })

  const courses = await payload.find({
    collection: 'vinkurser',
    where: {
      _status: { equals: 'published' },
    },
    limit: 1000,
  })

  log.info(`Syncing ${courses.docs.length} courses with Stripe...`)

  const syncPromises = courses.docs.map((course) =>
    syncCourseWithStripe(course.id.toString()).catch((error) => {
      log.error(`Failed to sync course ${course.id}:`, error)
      return null
    }),
  )

  const results = await Promise.allSettled(syncPromises)
  const successful = results.filter((result) => result.status === 'fulfilled').length

  log.info(`Successfully synced ${successful}/${courses.docs.length} courses with Stripe`)
}

/**
 * Get Stripe price by course ID
 */
export async function getStripePriceByCourseId(courseId: string): Promise<string | null> {
  const payload = await getPayload({ config })

  try {
    const course = (await payload.findByID({
      collection: 'vinkurser',
      id: courseId,
    })) as Vinkurser

    return course.stripePriceId || null
  } catch (error) {
    log.error(`Failed to get Stripe price for course ${courseId}:`, error)
    return null
  }
}

/**
 * Get Stripe price by subscription plan ID
 */
export function getStripePriceByPlanId(planId: string): string | null {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  return plan?.stripePriceId || null
}

/**
 * Get subscription plan details by ID
 */
export function getSubscriptionPlan(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId) || null
}

/**
 * Get all subscription plans
 */
export function getAllSubscriptionPlans(): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS
}

/**
 * Validate that a Stripe price exists and is active
 */
export async function validateStripePrice(priceId: string): Promise<boolean> {
  try {
    const stripe = getStripeServer()
    const price = await stripe.prices.retrieve(priceId)
    return price.active
  } catch (error) {
    log.error(`Failed to validate Stripe price ${priceId}:`, error)
    return false
  }
}

/**
 * Sync a TastingTemplate with Stripe — mirrors syncCourseWithStripe.
 * Each paid template gets its own Stripe Product + Price.
 * Stripe Prices are immutable, so price changes archive the old Price and
 * create a new one. Metadata productKind='template' lets the webhook branch.
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.2)
 */
export async function syncTemplateWithStripe(
  templateId: string,
  templateData?: {
    title?: string
    description?: string | null
    priceSek?: number
    stripeProductId?: string | null
    stripePriceId?: string | null
    featuredImage?: { url?: string | null } | number | string | null
  },
): Promise<{ productId: string; priceId: string }> {
  const payload = await getPayload({ config })

  let template: any
  if (templateData?.title && typeof templateData?.priceSek === 'number') {
    template = templateData
  } else {
    template = await payload.findByID({
      collection: 'tasting-templates',
      id: templateId,
      overrideAccess: true,
    })
    if (!template) {
      throw new Error(`Tasting template ${templateId} not found`)
    }
  }

  const title: string = (template.title || '').toString().trim()
  if (!title) {
    throw new Error(
      `Cannot sync template ${templateId} with Stripe: title is required but was empty.`,
    )
  }

  const description: string =
    (template.description && String(template.description).trim()) ||
    `Vinprovning: ${title}`

  const productData: any = {
    name: title,
    description,
    metadata: {
      templateId: String(templateId),
      productKind: 'template',
    },
  }

  if (
    template.featuredImage &&
    typeof template.featuredImage === 'object' &&
    (template.featuredImage as { url?: string | null }).url
  ) {
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const imageUrl = (template.featuredImage as { url: string }).url
    productData.images = [imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`]
  }

  const stripe = getStripeServer()

  let product
  if (template.stripeProductId) {
    try {
      product = await stripe.products.update(template.stripeProductId, productData)
    } catch (err) {
      log.error(`Failed to update Stripe template product ${template.stripeProductId}:`, err)
      product = await stripe.products.create(productData)
    }
  } else {
    product = await stripe.products.create(productData)
  }

  if (template.stripePriceId) {
    try {
      await stripe.prices.update(template.stripePriceId, { active: false })
    } catch (err) {
      log.error(`Failed to archive old template price ${template.stripePriceId}:`, err)
    }
  }

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: formatAmountForStripe(Number(template.priceSek || 0)),
    currency: STRIPE_CONFIG.currency,
    metadata: {
      templateId: String(templateId),
      productKind: 'template',
    },
  })

  try {
    await payload.update({
      collection: 'tasting-templates',
      id: templateId,
      data: {
        stripeProductId: product.id,
        stripePriceId: price.id,
      },
      overrideAccess: true,
    })
  } catch (err: any) {
    log.error(`Failed to save Stripe IDs to template ${templateId}: ${err?.message || err}`)
    log.info(`Stripe Product ID: ${product.id}; Stripe Price ID: ${price.id}`)
  }

  return { productId: product.id, priceId: price.id }
}

/**
 * Sync every published paid tasting template with Stripe. Called from
 * scripts/sync-templates-with-stripe.ts.
 */
export async function syncAllTemplatesWithStripe(): Promise<void> {
  const payload = await getPayload({ config })

  const templates = await payload.find({
    collection: 'tasting-templates',
    where: {
      publishedStatus: { equals: 'published' },
      accessLevel: { equals: 'paid' },
    },
    limit: 1000,
    overrideAccess: true,
  })

  log.info(`Syncing ${templates.docs.length} paid templates with Stripe...`)

  const syncPromises = templates.docs.map((t) =>
    syncTemplateWithStripe(t.id.toString()).catch((err) => {
      log.error(`Failed to sync template ${t.id}:`, err)
      return null
    }),
  )

  const results = await Promise.allSettled(syncPromises)
  const successful = results.filter((r) => r.status === 'fulfilled').length
  log.info(`Synced ${successful}/${templates.docs.length} templates with Stripe`)
}

/**
 * Get course purchase data for Stripe checkout
 */
export async function getCourseCheckoutData(courseId: string): Promise<{
  course: Vinkurser
  priceId: string
  amount: number
} | null> {
  const payload = await getPayload({ config })

  try {
    const course = (await payload.findByID({
      collection: 'vinkurser',
      id: courseId,
    })) as Vinkurser

    if (!course || !course.stripePriceId) {
      return null
    }

    return {
      course,
      priceId: course.stripePriceId,
      amount: course.price || 0,
    }
  } catch (error) {
    log.error(`Failed to get checkout data for course ${courseId}:`, error)
    return null
  }
}
