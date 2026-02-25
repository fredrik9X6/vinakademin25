import type { CollectionConfig } from 'payload'

export const Modules: CollectionConfig = {
  slug: 'modules',
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title'],
    description: 'Course modules that contain lessons and quizzes',
  },
  access: {
    read: () => true,
    create: ({ req }) => {
      if (!req.user) return true // form building
      return req.user.role === 'admin' || req.user.role === 'instructor'
    },
    update: ({ req }) => {
      if (!req.user) return true // form building
      return req.user.role === 'admin' || req.user.role === 'instructor'
    },
    delete: ({ req }) => req.user?.role === 'admin' || false,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
      },
    },
    // Content Items array - ordered lessons and quizzes
    {
      name: 'contentItems',
      type: 'array',
      admin: {
        description: 'Add and order lessons and quizzes in this module. Drag and drop to reorder. Click "Add Content Item" to select or create a new lesson or quiz.',
        initCollapsed: false,
      },
      fields: [
        {
          name: 'contentItem',
          type: 'relationship',
          relationTo: 'content-items',
          required: true,
          admin: {
            description: 'Select an existing content item or click "+ Create" to create a new lesson or quiz',
            allowCreate: true,
          },
        },
        {
          name: 'isFree',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Mark this content item as free preview (accessible without purchase)',
            position: 'sidebar',
          },
        },
      ],
    },
  ],
  timestamps: true,
}

