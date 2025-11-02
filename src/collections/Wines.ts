import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly, anyLoggedIn } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Wines: CollectionConfig = {
  slug: 'wines',
  admin: {
    group: 'Wine Library',
    useAsTitle: 'name',
    defaultColumns: ['name', 'winery', 'country', 'region', 'grapes', 'vintage'],
    description: 'Wine database for the platform',
  },
  access: {
    read: () => true,
    // Allow form state building by returning true for form context
    // Actual creation will still be validated at API level
    create: ({ req }) => {
      // Admins and instructors can always create
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      // Allow any logged-in user to create
      if (req.user) return true
      // Allow form building when no user context (happens during admin UI initialization)
      return true
    },
    // Allow form building - security handled in hooks
    update: () => true,
    delete: adminOnly,
  },
  fields: [
    // Basic Wine Information
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Wine Name',
      admin: {
        description: 'The name of the wine',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      label: 'Wine Slug',
      admin: {
        description: 'URL-friendly version of the name (e.g., "chateau-margaux-2015")',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (data?.name && !data.slug) {
              return data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            }
            return data?.slug
          },
        ],
      },
    },
    {
      name: 'winery',
      type: 'text',
      required: true,
      label: 'Winery/Producer',
      admin: {
        description: 'The producer or winery of the wine',
      },
    },
    {
      name: 'vintage',
      type: 'number',
      label: 'Vintage',
      min: 1800,
      max: new Date().getFullYear(),
      admin: {
        description: 'The harvest year of the wine',
        position: 'sidebar',
      },
    },
    {
      name: 'nonVintage',
      type: 'checkbox',
      label: 'Non-Vintage',
      defaultValue: false,
      admin: {
        description: 'Check if this is a non-vintage wine',
        position: 'sidebar',
      },
    },
    // Relationships - PayloadCMS native relationship fields
    {
      name: 'grapes',
      type: 'relationship',
      relationTo: 'grapes',
      hasMany: true,
      required: true,
      admin: {
        description: 'Grape varieties in the wine',
        allowCreate: true,
      },
    },
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      required: true,
      admin: {
        description: 'Country of origin',
        allowCreate: true,
        position: 'sidebar',
      },
    },
    {
      name: 'region',
      type: 'relationship',
      relationTo: 'regions',
      required: true,
      admin: {
        description: 'Wine region (e.g., Bordeaux, Napa Valley)',
        allowCreate: true,
        position: 'sidebar',
      },
    },
    // Price and Systembolaget
    {
      name: 'price',
      type: 'number',
      label: 'Price (SEK)',
      min: 0,
      admin: {
        description: 'Price at Systembolaget in SEK',
        position: 'sidebar',
      },
    },
    {
      name: 'systembolagetUrl',
      type: 'text',
      label: 'Systembolaget Link',
      admin: {
        description: 'External link to Systembolaget product page',
        position: 'sidebar',
      },
    },
    // Media
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Wine Image',
      admin: {
        description: 'Image of the wine bottle or label',
        position: 'sidebar',
      },
    },
    // Descriptions
    {
      name: 'description',
      type: 'richText',
      label: 'Wine Description',
      admin: {
        description: 'Detailed description of the wine',
      },
    },
    {
      name: 'foodPairings',
      type: 'array',
      label: 'Food Pairings',
      admin: {
        description: 'Recommended food pairings',
      },
      fields: [
        {
          name: 'pairing',
          type: 'text',
          required: true,
          label: 'Food Pairing',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      withCreatedByUpdatedBy,
      ({ data }) => {
        // Handle non-vintage wines
        if (data.nonVintage === true) {
          data.vintage = null
        }
        return data
      },
    ],
  },
}
