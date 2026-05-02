import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * Anonymous quiz submissions. Public access goes through the
 * /api/vinkompassen/* routes — never directly through this collection.
 * Collection-level CRUD is admin-only.
 */
export const VinkompassAttempts: CollectionConfig = {
  slug: 'vinkompass-attempts',
  admin: {
    group: 'Vinkompassen',
    useAsTitle: 'attemptId',
    defaultColumns: ['attemptId', 'archetype', 'email', 'createdAt'],
    description: 'Anonymous Vinkompassen quiz submissions',
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
      name: 'attemptId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Opaque token used in shareable URLs',
        position: 'sidebar',
      },
    },
    {
      name: 'answers',
      type: 'array',
      required: true,
      labels: { singular: 'Answer', plural: 'Answers' },
      fields: [
        {
          name: 'questionId',
          type: 'relationship',
          relationTo: 'vinkompass-questions',
          required: true,
        },
        { name: 'answerIndex', type: 'number', required: true, min: 0, max: 3 },
      ],
    },
    { name: 'scoreBody', type: 'number', required: true },
    { name: 'scoreComfort', type: 'number', required: true },
    {
      name: 'archetype',
      type: 'relationship',
      relationTo: 'vinkompass-archetypes',
      required: true,
    },
    { name: 'email', type: 'text' },
    { name: 'emailSubmittedAt', type: 'date' },
    {
      name: 'subscriberId',
      type: 'relationship',
      relationTo: 'subscribers',
      hasMany: false,
    },
    {
      name: 'userId',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: { description: 'Set if user was logged in at submit' },
    },
    { name: 'userAgent', type: 'text', admin: { readOnly: true } },
    { name: 'referer', type: 'text', admin: { readOnly: true } },
  ],
}
