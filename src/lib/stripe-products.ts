import { getStripeServer, STRIPE_CONFIG, formatAmountForStripe } from './stripe'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Course } from '@/payload-types'

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

// Pre-defined subscription plans for wine club memberships
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'wine_club_monthly',
    name: 'Vinprenumeration - Månadsvis',
    description: 'Månadsvis vinprenumeration med kurater viner och exklusiva kurser',
    price: 499, // SEK
    interval: 'month',
    features: [
      '2 kurerade viner per månad',
      'Exklusiv tillgång till nya kurser',
      'Månatliga vinprovningar',
      'Personlig vinrådgivning',
      'Medlemsrabatter på kurser',
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
      'Exklusiv tillgång till alla kurser',
      'Månatliga vinprovningar',
      'Personlig vinrådgivning',
      '20% rabatt på alla kurser',
      'Exklusiva årliga events',
      '2 månader gratis',
    ],
  },
]

/**
 * Sync a PayloadCMS course with Stripe product
 */
export async function syncCourseWithStripe(courseId: string): Promise<{
  productId: string
  priceId: string
}> {
  const payload = await getPayload({ config })

  // Fetch course from PayloadCMS
  const course = (await payload.findByID({
    collection: 'courses',
    id: courseId,
  })) as Course

  if (!course) {
    throw new Error(`Course with ID ${courseId} not found`)
  }

  // Create or update Stripe product
  const productData: any = {
    name: course.title,
    description: course.description || `Wine course: ${course.title}`,
    metadata: {
      courseId: course.id,
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
      console.error(`Failed to update Stripe product ${course.stripeProductId}:`, error)
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
      console.error(`Failed to archive old price ${course.stripePriceId}:`, error)
    }
  }

  // Create new price
  price = await stripe.prices.create({
    product: product.id,
    unit_amount: priceAmount,
    currency: STRIPE_CONFIG.currency,
    metadata: {
      courseId: course.id,
    },
  })

  // Update course in PayloadCMS with Stripe IDs
  await payload.update({
    collection: 'courses',
    id: courseId,
    data: {
      stripeProductId: product.id,
      stripePriceId: price.id,
    },
  })

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
    collection: 'courses',
    where: {
      _status: { equals: 'published' },
    },
    limit: 1000,
  })

  console.log(`Syncing ${courses.docs.length} courses with Stripe...`)

  const syncPromises = courses.docs.map((course) =>
    syncCourseWithStripe(course.id.toString()).catch((error) => {
      console.error(`Failed to sync course ${course.id}:`, error)
      return null
    }),
  )

  const results = await Promise.allSettled(syncPromises)
  const successful = results.filter((result) => result.status === 'fulfilled').length

  console.log(`Successfully synced ${successful}/${courses.docs.length} courses with Stripe`)
}

/**
 * Get Stripe price by course ID
 */
export async function getStripePriceByCourseId(courseId: string): Promise<string | null> {
  const payload = await getPayload({ config })

  try {
    const course = (await payload.findByID({
      collection: 'courses',
      id: courseId,
    })) as Course

    return course.stripePriceId || null
  } catch (error) {
    console.error(`Failed to get Stripe price for course ${courseId}:`, error)
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
    console.error(`Failed to validate Stripe price ${priceId}:`, error)
    return false
  }
}

/**
 * Get course purchase data for Stripe checkout
 */
export async function getCourseCheckoutData(courseId: string): Promise<{
  course: Course
  priceId: string
  amount: number
} | null> {
  const payload = await getPayload({ config })

  try {
    const course = (await payload.findByID({
      collection: 'courses',
      id: courseId,
    })) as Course

    if (!course || !course.stripePriceId) {
      return null
    }

    return {
      course,
      priceId: course.stripePriceId,
      amount: course.price || 0,
    }
  } catch (error) {
    console.error(`Failed to get checkout data for course ${courseId}:`, error)
    return null
  }
}
