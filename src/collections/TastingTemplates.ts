import type { CollectionConfig } from 'payload'

const slugifyTitle = (input: string): string =>
  String(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const TastingTemplates: CollectionConfig = {
  slug: 'tasting-templates',
  labels: { singular: 'Tasting template', plural: 'Tasting templates' },
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedStatus', 'publishedAt', 'updatedAt'],
    description: 'Admin-curated tasting plan templates that members can clone.',
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return { publishedStatus: { equals: 'published' } }
    },
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 100 },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly slug. Auto-generated from title if empty.',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            const source = data?.slug || data?.title
            if (source) return slugifyTitle(String(source))
            return data?.slug
          },
        ],
      },
    },
    { name: 'description', type: 'textarea', maxLength: 500 },
    { name: 'occasion', type: 'text' },
    {
      name: 'targetParticipants',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 50,
    },
    {
      name: 'wines',
      type: 'array',
      labels: { singular: 'Vin', plural: 'Viner' },
      fields: [
        {
          name: 'libraryWine',
          type: 'relationship',
          relationTo: 'wines',
          hasMany: false,
          required: true,
        },
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
      ],
    },
    { name: 'hostScript', type: 'textarea' },
    { name: 'featuredImage', type: 'upload', relationTo: 'media' },
    { name: 'seoTitle', type: 'text', maxLength: 60 },
    { name: 'seoDescription', type: 'text', maxLength: 160 },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      admin: {
        description: 'Free-form tags shown as filter chips on /provningsmallar.',
      },
    },
    {
      name: 'publishedStatus',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Publicerad', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stamped automatically the first time the template is published.',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // Stamp publishedAt on the draft → published transition (first publish).
        const wasPublished = originalDoc?.publishedStatus === 'published'
        const isPublished = data?.publishedStatus === 'published'
        if (operation === 'create' && isPublished && !data?.publishedAt) {
          return { ...data, publishedAt: new Date().toISOString() }
        }
        if (operation === 'update' && !wasPublished && isPublished && !originalDoc?.publishedAt) {
          return { ...data, publishedAt: new Date().toISOString() }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
