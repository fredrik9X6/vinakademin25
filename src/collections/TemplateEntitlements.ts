import type { CollectionConfig } from 'payload'

/**
 * Records a user's entitlement to a paid tasting template — created by the
 * Stripe webhook on `payment_intent.succeeded` when metadata.productKind ===
 * 'template'. Mirrors the Enrollments collection but for templates.
 *
 * The active subscription path (Subscriptions collection) and the designated
 * isFreeTrial template do NOT need a row here — the access predicate
 * canUseTemplate() short-circuits on both. Entitlements are created for:
 *   - one-time template purchases (acquiredVia: 'purchase')
 *   - first-time use of the free-trial template (acquiredVia: 'free_trial')
 *   - admin grants / backfills (acquiredVia: 'admin_grant')
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.3)
 */
export const TemplateEntitlements: CollectionConfig = {
  slug: 'template-entitlements',
  labels: {
    singular: 'Template entitlement',
    plural: 'Template entitlements',
  },
  admin: {
    group: 'Users & Progress',
    useAsTitle: 'id',
    defaultColumns: ['user', 'template', 'status', 'acquiredVia', 'acquiredAt'],
    description: 'Per-user, per-template unlock records for paid tasting templates.',
  },
  access: {
    // Admins see everything; users see only their own
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      if (!req.user) return false
      return { user: { equals: req.user.id } }
    },
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'template',
      type: 'relationship',
      relationTo: 'tasting-templates',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'acquiredVia',
      type: 'select',
      required: true,
      options: [
        { label: 'One-time purchase', value: 'purchase' },
        { label: 'Subscription', value: 'subscription' },
        { label: 'Free trial', value: 'free_trial' },
        { label: 'Free template', value: 'free' },
        { label: 'Admin grant', value: 'admin_grant' },
      ],
    },
    {
      name: 'acquiredAt',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
    },
    {
      name: 'payment',
      type: 'group',
      admin: {
        description: 'Set for purchase acquisitions only — null for free/trial/admin paths.',
      },
      fields: [
        { name: 'amount', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'SEK' },
        { name: 'transactionId', type: 'text', index: true },
        { name: 'paidAt', type: 'date' },
      ],
    },
  ],
  indexes: [
    {
      fields: ['user', 'template'],
      unique: true,
    },
  ],
  timestamps: true,
}
