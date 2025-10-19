import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'

export const UserWineLists: CollectionConfig = {
  slug: 'user-wine-lists',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'user', 'isSystem', 'createdAt'],
    description: 'User-defined wine lists (e.g., Favorites, Wishlist, or custom lists)',
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return { user: { equals: req.user?.id } }
    },
    create: anyLoggedIn,
    update: ({ req }) => req.user?.role === 'admin' || { user: { equals: req.user?.id } },
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (req.user) {
          if (operation === 'create') {
            data.createdBy = req.user.id
            data.updatedBy = req.user.id
          } else if (operation === 'update') {
            data.updatedBy = req.user.id
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        description: 'Owner of this wine list',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: false, // Unique per user, not globally
      admin: {
        description: 'Name of the wine list (e.g., Favorites, Wishlist, "My Summer Wines")',
      },
    },
    {
      name: 'isSystem',
      type: 'checkbox',
      label: 'System List',
      defaultValue: false,
      admin: {
        description: 'Is this a system/predefined list (e.g., Favorites, Wishlist)?',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who created this wine list',
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
        description: 'User who last updated this wine list',
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}

// NOTE: System lists (Favorites, Wishlist) are auto-created for new users via a hook in the Users collection.
