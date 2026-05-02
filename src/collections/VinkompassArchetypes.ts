import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

/**
 * Four wine personality archetypes — one per quadrant of the
 * Body × Comfort grid. Each has an editor-curated recommendedWines list.
 */
export const VinkompassArchetypes: CollectionConfig = {
  slug: 'vinkompass-archetypes',
  admin: {
    group: 'Vinkompassen',
    useAsTitle: 'name',
    defaultColumns: ['key', 'name', 'tagline'],
    description: 'The four wine personality archetypes',
  },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: 'key',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      options: [
        { label: 'Lätt + Klassisk', value: 'light-classic' },
        { label: 'Lätt + Äventyrlig', value: 'light-adventurous' },
        { label: 'Fyllig + Klassisk', value: 'bold-classic' },
        { label: 'Fyllig + Äventyrlig', value: 'bold-adventurous' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Display name (sv)',
    },
    {
      name: 'tagline',
      type: 'text',
      required: true,
      label: 'One-line tagline (sv)',
    },
    {
      name: 'description',
      type: 'richText',
      required: true,
      label: 'Personality description (sv)',
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Hero image',
    },
    {
      name: 'recommendedWines',
      type: 'relationship',
      relationTo: 'wines',
      hasMany: true,
      admin: {
        description: 'Curated bottle list (target 6, max 8). Order matters.',
      },
    },
    {
      name: 'recommendedVinprovning',
      type: 'relationship',
      relationTo: 'vinprovningar',
      hasMany: false,
      admin: {
        description: 'Soft pitch on the result page',
      },
    },
    {
      name: 'beehiivTag',
      type: 'text',
      required: true,
      admin: {
        description: 'Tag sent to Beehiiv at subscribe (e.g. "vk-light-classic")',
        position: 'sidebar',
      },
    },
  ],
}
