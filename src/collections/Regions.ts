import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Regions: CollectionConfig = {
  slug: 'regions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'country', 'createdBy'],
    description: 'Wine regions, related to a country',
  },
  access: {
    read: () => true,
    create: anyLoggedIn,
    update: anyLoggedIn,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [withCreatedByUpdatedBy],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: 'Region Name',
      admin: { description: 'Name of the region' },
    },
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      required: true,
      hasMany: false,
      admin: { description: 'Country this region belongs to' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who created this region entry',
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
        description: 'User who last updated this region entry',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: { description: 'Optional description or notes about this region' },
    },
  ],
  timestamps: true,
}
