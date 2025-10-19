/**
 * Stripe integration utilities for Vinakademin
 *
 * This file contains helper functions and types for managing Stripe subscriptions,
 * payment methods, and invoices. These functions are designed to work with both
 * the frontend components and backend webhook handlers.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'
import StripeServer from 'stripe'

// Environment variables validation
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

// Client-side Stripe instance (for frontend)
let stripePromise: Promise<Stripe | null>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey!, {
      // Configure for Swedish market
      locale: 'sv',
    })
  }
  return stripePromise
}

// Server-side Stripe instance (for backend API routes)
// Only create on server side to avoid client-side errors
let stripeServer: StripeServer | null = null

export const getStripeServer = () => {
  if (typeof window !== 'undefined') {
    throw new Error('getStripeServer() can only be called on the server side')
  }

  if (!stripeServer) {
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined')
    }
    stripeServer = new StripeServer(stripeSecretKey, {
      apiVersion: '2025-06-30.basil', // Latest API version
      typescript: true,
    })
  }

  return stripeServer
}

// For backward compatibility, export stripe as a getter
export const stripe = new Proxy({} as StripeServer, {
  get(target, prop) {
    if (typeof window !== 'undefined') {
      throw new Error('stripe instance can only be accessed on the server side')
    }
    return getStripeServer()[prop as keyof StripeServer]
  },
})

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // Primary currency for Swedish market
  currency: 'sek' as const,

  // Supported payment methods for Swedish market
  paymentMethods: [
    'card',
    'klarna', // Popular in Sweden
  ] as const,

  // Webhook endpoint path
  webhookEndpoint: '/api/webhooks/stripe',

  // Success and cancel URLs for checkout
  urls: {
    success: '/checkout/success',
    cancel: '/checkout/cancel',
  },

  // Automatic tax calculation (important for Swedish VAT)
  automaticTax: {
    enabled: true,
  },

  // Customer portal configuration
  customerPortal: {
    features: {
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true },
      subscription_pause: { enabled: true },
      invoice_history: { enabled: true },
    },
  },
} as const

// Utility functions for Stripe operations

/**
 * Format amount for Stripe (converts to öre for SEK)
 * Stripe expects amounts in the smallest currency unit
 */
export function formatAmountForStripe(
  amount: number,
  currency: string = STRIPE_CONFIG.currency,
): number {
  switch (currency.toLowerCase()) {
    case 'sek':
      // SEK uses öre (1 SEK = 100 öre)
      return Math.round(amount * 100)
    default:
      throw new Error(`Unsupported currency: ${currency}`)
  }
}

/**
 * Format amount for display (converts from öre to SEK)
 */
export function formatAmountFromStripe(
  amount: number,
  currency: string = STRIPE_CONFIG.currency,
): number {
  switch (currency.toLowerCase()) {
    case 'sek':
      return amount / 100
    default:
      throw new Error(`Unsupported currency: ${currency}`)
  }
}

/**
 * Format price for Swedish locale display
 */
export function formatPrice(amount: number, currency: string = STRIPE_CONFIG.currency): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Create Stripe customer or retrieve existing one
 */
export async function getOrCreateStripeCustomer(
  email: string,
  userId: string,
  name?: string,
): Promise<StripeServer.Customer> {
  // First, try to find existing customer by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }

  // Create new customer if none exists
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  })
}

/**
 * Validate webhook signature for security
 */
export function validateWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): StripeServer.Event {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`)
  }
}

// Type exports for better TypeScript support
export type StripeCustomer = StripeServer.Customer
export type StripePaymentIntent = StripeServer.PaymentIntent
export type StripeSubscription = StripeServer.Subscription
export type StripePrice = StripeServer.Price
export type StripeProduct = StripeServer.Product
export type StripeEvent = StripeServer.Event

// Stripe type definitions (will import from '@stripe/stripe-js' when Stripe is installed)
interface Subscription {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at_period_end: boolean
  customer: string | { id: string }
  items: {
    data: Array<{
      price?: {
        unit_amount?: number
        currency?: string
        recurring?: {
          interval?: string
        }
      }
    }>
  }
}

interface PaymentMethod {
  id: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
}

interface StripeInvoice {
  id: string
  number?: string
  status?: string
  amount_due?: number
  currency: string
  created: number
  period_start?: number
  period_end?: number
  invoice_pdf?: string
}

// Define our application-specific types that align with our Payload collections
export interface AppSubscription {
  id: string
  planName: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  amount: number
  currency: string
  interval: 'month' | 'year'
  stripeSubscriptionId?: string
  stripeCustomerId?: string
}

export interface AppPaymentMethod {
  id: string
  type: 'card'
  brand: string
  last4: string
  expiryMonth: number
  expiryYear: number
  isDefault: boolean
  stripePaymentMethodId?: string
}

export interface AppInvoice {
  id: string
  number: string
  status: 'paid' | 'pending' | 'failed'
  amount: number
  currency: string
  date: string
  periodStart: string
  periodEnd: string
  downloadUrl?: string
  stripeInvoiceId?: string
}

/**
 * Convert Stripe subscription to our app subscription format
 */
export function transformStripeSubscription(
  stripeSubscription: Subscription,
  planName?: string,
): AppSubscription {
  return {
    id: stripeSubscription.id,
    planName: planName || 'Unknown Plan',
    status: stripeSubscription.status as AppSubscription['status'],
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    amount: stripeSubscription.items.data[0]?.price?.unit_amount || 0,
    currency: stripeSubscription.items.data[0]?.price?.currency || 'sek',
    interval:
      (stripeSubscription.items.data[0]?.price?.recurring?.interval as 'month' | 'year') || 'month',
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId:
      typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id,
  }
}

/**
 * Convert Stripe payment method to our app payment method format
 */
export function transformStripePaymentMethod(
  stripePaymentMethod: PaymentMethod,
  isDefault: boolean = false,
): AppPaymentMethod {
  const card = stripePaymentMethod.card
  if (!card) {
    throw new Error('Only card payment methods are supported')
  }

  return {
    id: stripePaymentMethod.id,
    type: 'card',
    brand: card.brand,
    last4: card.last4,
    expiryMonth: card.exp_month,
    expiryYear: card.exp_year,
    isDefault,
    stripePaymentMethodId: stripePaymentMethod.id,
  }
}

/**
 * Convert Stripe invoice to our app invoice format
 */
export function transformStripeInvoice(stripeInvoice: StripeInvoice): AppInvoice {
  return {
    id: stripeInvoice.id,
    number: stripeInvoice.number || stripeInvoice.id,
    status:
      stripeInvoice.status === 'paid'
        ? 'paid'
        : stripeInvoice.status === 'open'
          ? 'pending'
          : 'failed',
    amount: stripeInvoice.amount_due || 0,
    currency: stripeInvoice.currency,
    date: new Date(stripeInvoice.created * 1000).toISOString(),
    periodStart: stripeInvoice.period_start
      ? new Date(stripeInvoice.period_start * 1000).toISOString()
      : new Date(stripeInvoice.created * 1000).toISOString(),
    periodEnd: stripeInvoice.period_end
      ? new Date(stripeInvoice.period_end * 1000).toISOString()
      : new Date(stripeInvoice.created * 1000).toISOString(),
    downloadUrl: stripeInvoice.invoice_pdf,
    stripeInvoiceId: stripeInvoice.id,
  }
}

/**
 * API wrapper functions for Stripe operations
 * These functions should be implemented to call your backend API endpoints
 * which in turn interact with Stripe
 */

export interface StripeApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Fetch user's current subscription
 */
export async function fetchUserSubscription(
  userId: string,
): Promise<StripeApiResponse<AppSubscription>> {
  try {
    const response = await fetch(`/api/subscriptions/user/${userId}`)
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch subscription' }
    }

    return { success: true, data: data.subscription }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Fetch user's payment methods
 */
export async function fetchUserPaymentMethods(
  userId: string,
): Promise<StripeApiResponse<AppPaymentMethod[]>> {
  try {
    const response = await fetch(`/api/payment-methods/user/${userId}`)
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch payment methods' }
    }

    return { success: true, data: data.paymentMethods }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Fetch user's invoices
 */
export async function fetchUserInvoices(userId: string): Promise<StripeApiResponse<AppInvoice[]>> {
  try {
    const response = await fetch(`/api/invoices/user/${userId}`)
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch invoices' }
    }

    return { success: true, data: data.invoices }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
): Promise<StripeApiResponse<AppSubscription>> {
  try {
    const response = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to cancel subscription' }
    }

    return { success: true, data: data.subscription }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Add payment method
 */
export async function addPaymentMethod(
  userId: string,
  paymentMethodId: string,
): Promise<StripeApiResponse<AppPaymentMethod>> {
  try {
    const response = await fetch(`/api/payment-methods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, paymentMethodId }),
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to add payment method' }
    }

    return { success: true, data: data.paymentMethod }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  userId: string,
  paymentMethodId: string,
): Promise<StripeApiResponse<boolean>> {
  try {
    const response = await fetch(`/api/payment-methods/${paymentMethodId}/set-default`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to set default payment method' }
    }

    return { success: true, data: true }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(
  paymentMethodId: string,
): Promise<StripeApiResponse<boolean>> {
  try {
    const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to remove payment method' }
    }

    return { success: true, data: true }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Download invoice
 */
export async function downloadInvoice(invoiceId: string): Promise<StripeApiResponse<string>> {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/download`)

    if (!response.ok) {
      const data = await response.json()
      return { success: false, error: data.message || 'Failed to download invoice' }
    }

    // Trigger download
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${invoiceId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    return { success: true, data: 'Downloaded successfully' }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Update billing information
 */
export async function updateBillingInfo(
  userId: string,
  billingInfo: {
    name: string
    email: string
    address: string
    city: string
    postalCode: string
    country: string
  },
): Promise<StripeApiResponse<boolean>> {
  try {
    const response = await fetch(`/api/billing/user/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(billingInfo),
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to update billing information' }
    }

    return { success: true, data: true }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Create setup intent for adding new payment method
 */
export async function createSetupIntent(
  userId: string,
): Promise<StripeApiResponse<{ clientSecret: string }>> {
  try {
    const response = await fetch(`/api/setup-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to create setup intent' }
    }

    return { success: true, data: { clientSecret: data.clientSecret } }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

/**
 * Plan configuration
 */
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Vinakademin Premium - Månadsvis',
    amount: 299,
    currency: 'SEK',
    interval: 'month' as const,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
  },
  annual: {
    id: 'annual',
    name: 'Vinakademin Premium - Årligen',
    amount: 2990,
    currency: 'SEK',
    interval: 'year' as const,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID,
  },
  student_monthly: {
    id: 'student_monthly',
    name: 'Student - Månadsvis',
    amount: 199,
    currency: 'SEK',
    interval: 'month' as const,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_MONTHLY_PRICE_ID,
  },
  student_annual: {
    id: 'student_annual',
    name: 'Student - Årligen',
    amount: 1990,
    currency: 'SEK',
    interval: 'year' as const,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STUDENT_ANNUAL_PRICE_ID,
  },
} as const

export type PlanId = keyof typeof SUBSCRIPTION_PLANS
