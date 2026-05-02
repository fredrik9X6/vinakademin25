import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly } from '../lib/access'

/**
 * Quiz questions for the Vinkompassen lead-magnet.
 * Each question has exactly 4 answer options; each answer carries
 * scoreBody and scoreComfort in [-2..+2].
 */
export const VinkompassQuestions: CollectionConfig = {
  slug: 'vinkompass-questions',
  admin: {
    group: 'Vinkompassen',
    useAsTitle: 'question',
    defaultColumns: ['order', 'question', 'active'],
    description: 'Quiz questions for the Vinkompassen lead-magnet',
    defaultSort: 'order',
  },
  access: {
    read: () => true,
    create: adminOrInstructorOnly,
    update: adminOrInstructorOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'order',
      type: 'number',
      required: true,
      index: true,
      admin: { description: 'Display order (1-based)', position: 'sidebar' },
    },
    {
      name: 'question',
      type: 'text',
      required: true,
      label: 'Question (sv)',
    },
    {
      name: 'helperText',
      type: 'text',
      label: 'Helper text (optional)',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Question image (optional)',
    },
    {
      name: 'answers',
      type: 'array',
      required: true,
      minRows: 4,
      maxRows: 4,
      labels: { singular: 'Answer', plural: 'Answers' },
      admin: {
        description: 'Exactly four answers per question',
      },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Answer image (optional)',
        },
        {
          name: 'scoreBody',
          type: 'number',
          required: true,
          min: -2,
          max: 2,
          admin: { description: '-2 = very light, +2 = very bold' },
        },
        {
          name: 'scoreComfort',
          type: 'number',
          required: true,
          min: -2,
          max: 2,
          admin: { description: '-2 = very classic, +2 = very adventurous' },
        },
      ],
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
