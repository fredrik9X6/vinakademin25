import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * Append-only audit/event log. Powers the lightweight CRM timeline.
 *
 * Writes happen exclusively via `src/lib/events.ts#recordEvent`. The collection
 * is admin-only at the API surface — application code uses `req.payload.create`
 * with a server-side context, so access control bypasses don't apply there.
 */
export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    group: 'CRM',
    useAsTitle: 'label',
    defaultColumns: ['createdAt', 'type', 'contactEmail', 'label'],
    description: 'Activity timeline used by the internal CRM',
    pagination: { defaultLimit: 50 },
  },
  access: {
    read: adminOnly,
    // Creates are server-side only (recordEvent uses payload.create with no req.user).
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  timestamps: true,
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Newsletter — subscribed', value: 'newsletter_subscribed' },
        { label: 'Newsletter — unsubscribed', value: 'newsletter_unsubscribed' },
        { label: 'Account — created', value: 'account_created' },
        { label: 'Account — verified', value: 'account_verified' },
        { label: 'Onboarding — completed', value: 'onboarding_completed' },
        { label: 'Marketing opt-in changed', value: 'marketing_opt_in_changed' },
        { label: 'Order — paid', value: 'order_paid' },
        { label: 'Order — refunded', value: 'order_refunded' },
        { label: 'Enrollment — started', value: 'enrollment_started' },
        { label: 'Course — completed', value: 'course_completed' },
        { label: 'Quiz — passed', value: 'quiz_passed' },
        { label: 'Review — submitted', value: 'review_submitted' },
        { label: 'Wine — added to list', value: 'wine_added_to_list' },
        { label: 'Login', value: 'login' },
      ],
    },
    {
      name: 'contactEmail',
      type: 'email',
      required: true,
      index: true,
      admin: {
        description:
          'The merge key for the timeline. Lower-cased on write so anonymous Subscribers and registered Users align.',
      },
    },
    {
      name: 'label',
      type: 'text',
      required: true,
      admin: {
        description: 'Short human-readable label rendered in the timeline.',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        description: 'Linked user, when known.',
      },
    },
    {
      name: 'subscriber',
      type: 'relationship',
      relationTo: 'subscribers',
      hasMany: false,
      admin: {
        description: 'Linked subscriber, when known.',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Free-form payload (order id, course slug, score, etc.).',
      },
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'system',
      options: [
        { label: 'Web (user action)', value: 'web' },
        { label: 'Webhook', value: 'webhook' },
        { label: 'System (hook)', value: 'system' },
        { label: 'Cron', value: 'cron' },
        { label: 'Manual (admin)', value: 'manual' },
      ],
    },
  ],
}
