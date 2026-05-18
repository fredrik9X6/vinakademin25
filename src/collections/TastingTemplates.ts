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
          admin: { description: 'Pick from our curated library, OR fill out customWine below.' },
        },
        {
          name: 'customWine',
          type: 'group',
          admin: {
            description:
              'Use when the wine is not in the library — usually a Systembolaget snapshot.',
          },
          fields: [
            { name: 'name', type: 'text' },
            { name: 'producer', type: 'text' },
            { name: 'vintage', type: 'text' },
            {
              name: 'type',
              type: 'select',
              options: [
                { label: 'Rött', value: 'red' },
                { label: 'Vitt', value: 'white' },
                { label: 'Rosé', value: 'rose' },
                { label: 'Mousserande', value: 'sparkling' },
                { label: 'Dessert', value: 'dessert' },
                { label: 'Fortifierat', value: 'fortified' },
                { label: 'Annat', value: 'other' },
              ],
            },
            { name: 'systembolagetUrl', type: 'text' },
            { name: 'priceSek', type: 'number', min: 0 },
            { name: 'systembolagetProductNumber', type: 'text' },
            { name: 'imageUrl', type: 'text' },
          ],
        },
        { name: 'pourOrder', type: 'number', min: 1 },
        { name: 'hostNotes', type: 'textarea' },
      ],
      validate: (value: unknown) => {
        if (!Array.isArray(value)) return true
        for (let i = 0; i < value.length; i++) {
          const w = value[i] as { libraryWine?: unknown; customWine?: { name?: string } }
          const hasLibrary = w?.libraryWine != null && w.libraryWine !== ''
          const hasCustom = !!w?.customWine?.name && w.customWine.name.trim() !== ''
          if (hasLibrary && hasCustom) {
            return `Vin ${i + 1}: välj antingen ett bibliotekvin ELLER fyll i custom wine — inte båda.`
          }
          if (!hasLibrary && !hasCustom) {
            return `Vin ${i + 1}: välj ett bibliotekvin eller fyll i namn på custom wine.`
          }
        }
        return true
      },
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
      name: 'accessLevel',
      type: 'select',
      required: true,
      defaultValue: 'free',
      options: [
        { label: 'Fri – alla kan se', value: 'free' },
        { label: 'Endast medlemmar', value: 'members_only' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Free templates render wine details to everyone. Members-only templates redact wines for non-members; only count + total price are visible.',
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
