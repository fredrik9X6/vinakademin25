import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Countries: CollectionConfig = {
  slug: 'countries',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'createdBy'],
    description: 'Countries for wine origin',
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
      label: 'Country Name',
      admin: { description: 'Name of the country' },
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
      type: 'textarea',
      label: 'Description',
      admin: { description: 'Optional description or notes about this country' },
    },
  ],
  timestamps: true,
}
