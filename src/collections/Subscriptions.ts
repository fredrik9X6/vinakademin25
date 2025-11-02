import type { CollectionConfig } from 'payload'
import { adminOrSelf, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  admin: {
    useAsTitle: 'subscriptionNumber',
    defaultColumns: ['subscriptionNumber', 'status', 'planId', 'user', 'currentPeriodEnd'],
    description: 'Wine club subscription management',
    group: 'Commerce',
  },
  access: {
    read: adminOrSelf,
    create: ({ req }) => {
      // Only authenticated users can create subscriptions (through API)
      return Boolean(req.user)
    },
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [withCreatedByUpdatedBy],
    beforeValidate: [
      // Generate subscription number if not provided
      ({ data, operation }) => {
        if (operation === 'create' && data && !data.subscriptionNumber) {
          data.subscriptionNumber = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        }
      },
    ],
  },
  fields: [
    {
      name: 'subscriptionNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique subscription identifier',
        readOnly: true,
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Subscriber',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Trialing', value: 'trialing' },
        { label: 'Past Due', value: 'past_due' },
        { label: 'Cancelled', value: 'canceled' },
        { label: 'Unpaid', value: 'unpaid' },
        { label: 'Paused', value: 'paused' },
      ],
      admin: {
        description: 'Current subscription status',
      },
    },
    {
      name: 'planId',
      type: 'select',
      required: true,
      options: [
        { label: 'Monthly Wine Club', value: 'wine_club_monthly' },
        { label: 'Yearly Wine Club', value: 'wine_club_yearly' },
      ],
      admin: {
        description: 'Subscription plan type',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Subscription amount (in SEK)',
      },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'SEK',
      admin: {
        description: 'Subscription currency',
        readOnly: true,
      },
    },
    {
      name: 'interval',
      type: 'select',
      required: true,
      options: [
        { label: 'Month', value: 'month' },
        { label: 'Year', value: 'year' },
      ],
      admin: {
        description: 'Billing interval',
      },
    },
    // Stripe Integration Fields
    {
      name: 'stripeSubscriptionId',
      type: 'text',
      unique: true,
      admin: {
        description: 'Stripe Subscription ID',
        readOnly: true,
      },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: {
        description: 'Stripe Customer ID',
        readOnly: true,
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'Stripe Price ID for this subscription plan',
        readOnly: true,
      },
    },
    // Billing Cycle Information
    {
      name: 'currentPeriodStart',
      type: 'date',
      required: true,
      admin: {
        description: 'Start of current billing period',
      },
    },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      required: true,
      admin: {
        description: 'End of current billing period',
      },
    },
    {
      name: 'trialStart',
      type: 'date',
      admin: {
        description: 'Trial period start (if applicable)',
      },
    },
    {
      name: 'trialEnd',
      type: 'date',
      admin: {
        description: 'Trial period end (if applicable)',
      },
    },
    {
      name: 'cancelAt',
      type: 'date',
      admin: {
        description: 'Scheduled cancellation date',
      },
    },
    {
      name: 'cancelAtPeriodEnd',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Cancel at the end of current billing period',
      },
    },
    {
      name: 'canceledAt',
      type: 'date',
      admin: {
        description: 'When subscription was cancelled',
        readOnly: true,
      },
    },
    // Payment Information
    {
      name: 'defaultPaymentMethod',
      type: 'json',
      admin: {
        description: 'Default payment method details',
        readOnly: true,
      },
    },
    {
      name: 'latestInvoice',
      type: 'text',
      admin: {
        description: 'Latest invoice ID from Stripe',
        readOnly: true,
      },
    },
    // Subscription Benefits and Features
    {
      name: 'features',
      type: 'array',
      fields: [
        {
          name: 'feature',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Subscription features and benefits',
      },
    },
    {
      name: 'coursesIncluded',
      type: 'relationship',
      relationTo: 'vinprovningar',
      hasMany: true,
      admin: {
        description: 'Courses included with this subscription',
      },
    },
    {
      name: 'discountPercent',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: 'Discount percentage for course purchases',
      },
    },
    // Notes and Metadata
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this subscription',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional subscription metadata',
      },
    },
  ],
}
