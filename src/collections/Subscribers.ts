import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * Local mirror of newsletter / marketing contacts. One row per email.
 * Anonymous newsletter signups land here even when there's no user account yet;
 * registered users get a `relatedUser` link so the CRM can merge timelines.
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  admin: {
    group: 'CRM',
    useAsTitle: 'email',
    defaultColumns: ['email', 'status', 'source', 'subscribedAt', 'unsubscribedAt'],
    description: 'Newsletter / marketing contacts mirrored from Beehiiv',
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  timestamps: true,
  fields: [
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'subscribed',
      options: [
        { label: 'Subscribed', value: 'subscribed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Footer form', value: 'footer' },
        { label: 'Newsletter page', value: 'newsletter_page' },
        { label: 'Registration', value: 'registration' },
        { label: 'Onboarding', value: 'onboarding' },
        { label: 'Profile settings', value: 'profile' },
        { label: 'Manual', value: 'manual' },
        { label: 'Vinkompassen', value: 'vinkompassen' },
      ],
    },
    {
      name: 'beehiivId',
      type: 'text',
      label: 'Beehiiv subscription ID',
      admin: {
        description: 'Returned by Beehiiv on subscribe; used to look up status updates.',
      },
    },
    {
      name: 'relatedUser',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        description:
          'Linked when this email matches a registered user. Auto-populated on subscribe.',
      },
    },
    {
      name: 'tags',
      type: 'array',
      labels: { singular: 'Tag', plural: 'Tags' },
      fields: [{ name: 'value', type: 'text', required: true }],
      admin: {
        description: 'Manual tags for the lightweight CRM (e.g. "VIP", "press", "B2B-lead").',
      },
    },
    {
      name: 'leadMagnet',
      type: 'group',
      admin: {
        description:
          'Set when this signup came from a lead-magnet offer (ebook, quiz, etc). Both fields are populated together.',
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'E-book', value: 'ebook' },
            { label: 'Quiz', value: 'quiz' },
            { label: 'Webinar', value: 'webinar' },
            { label: 'Video', value: 'video' },
            { label: 'Download', value: 'download' },
            { label: 'Template', value: 'template' },
          ],
        },
        {
          name: 'slug',
          type: 'text',
          admin: { description: 'Specific lead magnet, e.g. "grunderna-i-vin".' },
        },
      ],
    },
    {
      name: 'subscribedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'lastSyncError',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Last error returned by Beehiiv when syncing this contact (if any).',
      },
    },
  ],
}
