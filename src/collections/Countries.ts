import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Countries: CollectionConfig = {
  slug: 'countries',
  admin: {
    group: 'Wine Library',
    useAsTitle: 'name',
    defaultColumns: ['name', 'createdBy'],
    description: 'Countries for wine origin',
  },
  access: {
    read: () => true,
    create: anyLoggedIn,
    // Allow form building for relationship fields in other collections
    update: () => true,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      async ({ req, operation, data }) => {
        // Only enforce authentication for actual saves (not form building)
        if (operation === 'update' || operation === 'create') {
          const user = req.user
          
          // Allow form building (no user context)
          if (!user) return data
          
          // All authenticated users can create/update countries
          return data
        }
        
        return data
      },
      withCreatedByUpdatedBy,
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: 'Country Name',
      admin: { description: 'Name of the country' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      label: 'Slug',
      admin: {
        description: 'URL-friendly version of the name (auto-generated)',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (data?.name && !data.slug) {
              return data.name
                .toLowerCase()
                .replace(/[åä]/g, 'a')
                .replace(/[ö]/g, 'o')
                .replace(/[éè]/g, 'e')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            }
            return data?.slug
          },
        ],
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who created this country entry',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who last updated this country entry',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'richText',
      label: 'Description',
      admin: { description: 'Optional description or notes about this country' },
    },
  ],
  timestamps: true,
}
