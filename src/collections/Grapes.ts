import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Grapes: CollectionConfig = {
  slug: 'grapes',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'color', 'createdBy'],
    description: 'Grape varieties/varietals for wines',
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
      label: 'Grape Name',
      admin: { description: 'Name of the grape/varietal' },
    },
    {
      name: 'color',
      type: 'select',
      options: [
        { label: 'Red', value: 'red' },
        { label: 'White', value: 'white' },
      ],
      admin: { description: 'Color category of the grape' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who created this grape entry',
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
        description: 'User who last updated this grape entry',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: { description: 'Optional description or notes about this grape' },
    },
  ],
  timestamps: true,
}
