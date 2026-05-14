import type { CollectionConfig } from 'payload'

export const TastingPlans: CollectionConfig = {
  slug: 'tasting-plans',
  labels: { singular: 'Tasting plan', plural: 'Tasting plans' },
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title', 'owner', 'status', 'updatedAt'],
    description: 'Member-authored tasting plans. Private to the owner.',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { owner: { equals: req.user.id } }
    },
    create: ({ req }) => !!req.user,
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { owner: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { owner: { equals: req.user.id } }
    },
  },
  fields: [
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { description: 'The member who created this plan.' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 500,
    },
    {
      name: 'occasion',
      type: 'text',
      admin: { description: 'e.g. "Födelsedagsmiddag", "Sommarrosé-flight"' },
    },
    {
      name: 'targetParticipants',
      type: 'number',
      defaultValue: 4,
      min: 1,
      max: 50,
    },
    {
      name: 'blindTastingByDefault',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'When checked, sessions started from this plan default to blind tasting.',
      },
    },
    {
      name: 'defaultMinutesPerWine',
      type: 'number',
      min: 1,
      max: 60,
      admin: {
        description: 'Optional per-wine timer in minutes (1–60). Leave empty for no timer.',
        position: 'sidebar',
      },
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
          admin: { description: 'Pick from our library, OR fill out customWine below.' },
        },
        {
          name: 'customWine',
          type: 'group',
          admin: { description: 'Use when the wine is not in the library.' },
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
            {
              name: 'systembolagetProductNumber',
              type: 'text',
              admin: {
                description:
                  'Set when this snapshot was populated from the Systembolaget product picker.',
              },
            },
            {
              name: 'imageUrl',
              type: 'text',
              admin: {
                description:
                  'Bottle image URL. Populated by the Systembolaget picker (CDN URL on systembolaget.se) — left empty for hand-typed custom wines.',
              },
            },
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
    {
      name: 'hostScript',
      type: 'textarea',
      admin: { description: 'Optional flavor text for the host cheat sheet (Chunk C).' },
    },
    {
      name: 'publishedToProfile',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          "When checked, this plan appears on the owner's /profil/<handle> profile.",
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Klar', value: 'ready' },
        { label: 'Arkiverad', value: 'archived' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'derivedFromTemplate',
      type: 'relationship',
      relationTo: 'tasting-templates',
      hasMany: false,
      admin: {
        description: 'Set when this plan was cloned from a TastingTemplate.',
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user && !data.owner) {
          return { ...data, owner: req.user.id }
        }
        return data
      },
    ],
  },
  timestamps: true,
}
