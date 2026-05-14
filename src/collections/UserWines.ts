import type { CollectionConfig } from 'payload'
import { adminOnly, anyLoggedIn } from '../lib/access'

export const UserWines: CollectionConfig = {
  slug: 'user-wines',
  admin: {
    group: 'Wine Library',
    useAsTitle: 'title',
    defaultColumns: ['user', 'wine', 'status', 'rating'],
    description: 'User wine collections including tried, favorites, and wishlist items',
  },
  access: {
    // Only authenticated users can read user wine entries
    read: ({ req }) => {
      const user = req.user

      if (!user) return false

      // Admins can read all user wine entries
      if (user.role === 'admin') return true

      // Regular users can only read their own entries
      return {
        user: {
          equals: user.id,
        },
      }
    },
    // Only authenticated users can create entries
    create: anyLoggedIn,
    // Users can only update their own entries, admins can update any
    update: ({ req }) => {
      const user = req.user

      if (!user) return false

      if (user.role === 'admin') return true

      return {
        user: {
          equals: user.id,
        },
      }
    },
    // Only admins can delete entries
    delete: adminOnly,
  },
  fields: [
    // Auto-generated title combining user and wine
    {
      name: 'title',
      type: 'text',
      label: 'Display Title',
      admin: {
        readOnly: true,
        description: 'Automatically generated display title (User + Wine)',
      },
      hooks: {
        beforeChange: [
          async ({ data, req, operation }) => {
            // Skip if already has title and not being created
            if (data?.title && operation !== 'create') return data.title

            if (!data?.user || !data?.wine) return 'New User Wine Entry'

            try {
              const payload = req.payload
              const wine = await payload.findByID({
                collection: 'wines',
                id: data.wine,
              })

              const user = await payload.findByID({
                collection: 'users',
                id: data.user,
              })

              if (wine && user) {
                return `${user.email} - ${wine.name}`
              }

              return 'User Wine Entry'
            } catch (error) {
              return 'User Wine Entry'
            }
          },
        ],
      },
    },
    // Relationship to user
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        description: 'User who owns this wine entry',
      },
      hooks: {
        beforeChange: [
          ({ req, data, operation }) => {
            // If creating a new entry, set the user to the current user
            if (operation === 'create' && !data?.user && req.user) {
              return req.user.id
            }

            return data?.user
          },
        ],
      },
    },
    // Relationship to library wine — optional after Chunk A (custom-wine support).
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      required: false,
      hasMany: false,
      admin: {
        description: 'Library wine, OR leave empty and fill customWine below.',
      },
    },
    // Custom-wine snapshot for entries not in our library.
    // Exactly one of `wine` or `customWine.name` must be set — see beforeValidate hook.
    {
      name: 'customWine',
      type: 'group',
      admin: {
        description: 'Use when the wine is not in our library.',
      },
      fields: [
        { name: 'name', type: 'text' },
        { name: 'producer', type: 'text' },
        { name: 'vintage', type: 'text' },
        { name: 'type', type: 'text', admin: { description: 'e.g. rött, vitt, rosé, mousserande' } },
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
      ],
    },
    // Collection status
    {
      name: 'list',
      type: 'relationship',
      relationTo: 'user-wine-lists',
      required: true,
      hasMany: false,
      admin: {
        description: 'The list this wine belongs to (e.g., Favorites, Wishlist, or a custom list)',
      },
    },
    // NOTE: 'user-wine-lists' is a new collection that must be created for this relationship to work.
    // The linter error will resolve once the collection exists and is registered in Payload config.
    // User rating
    {
      name: 'rating',
      type: 'number',
      min: 1,
      max: 5,
      admin: {
        description: 'User rating from 1-5',
        condition: (data) => data?.status === 'tried' || data?.status === 'favorite',
      },
    },
    // User notes
    {
      name: 'notes',
      type: 'richText',
      label: 'User Notes',
      admin: {
        description: 'User personal notes about this wine',
      },
    },
    // Purchase info
    {
      name: 'purchaseInfo',
      type: 'group',
      label: 'Purchase Information',
      admin: {
        description: 'Details about where/when the wine was purchased',
        condition: (data) => data?.status === 'owned' || data?.status === 'tried',
      },
      fields: [
        {
          name: 'purchaseDate',
          type: 'date',
          label: 'Purchase Date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
          },
        },
        {
          name: 'purchaseLocation',
          type: 'text',
          label: 'Purchase Location',
        },
        {
          name: 'price',
          type: 'number',
          label: 'Price Paid (SEK)',
          min: 0,
        },
      ],
    },
    // Custom tags
    {
      name: 'tags',
      type: 'array',
      label: 'Personal Tags',
      admin: {
        description: 'User personal categorization tags',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const hasLibrary = data.wine != null && data.wine !== ''
        const hasCustom = !!data.customWine?.name && String(data.customWine.name).trim() !== ''
        if (hasLibrary && hasCustom) {
          throw new Error(
            'UserWines: välj antingen ett bibliotekvin eller fyll i customWine — inte båda.',
          )
        }
        if (!hasLibrary && !hasCustom) {
          throw new Error(
            'UserWines: ange ett bibliotekvin eller fyll i namn på customWine.',
          )
        }
        return data
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        if (operation !== 'create') return doc

        void (async () => {
          const { recordEvent } = await import('../lib/events')
          const userId = typeof doc.user === 'object' ? (doc.user as any)?.id : doc.user
          let email: string | null =
            typeof doc.user === 'object' ? (doc.user as any)?.email || null : null
          if (!email && userId) {
            try {
              const u = await req.payload.findByID({
                collection: 'users',
                id: userId,
                depth: 0,
              })
              email = (u as any)?.email || null
            } catch {
              // ignore
            }
          }
          if (!email) return
          const wineId = typeof doc.wine === 'object' ? (doc.wine as any)?.id : doc.wine
          await recordEvent({
            payload: req.payload,
            type: 'wine_added_to_list',
            contactEmail: email,
            label: `Added wine to "${doc.status || 'list'}"`,
            userId: userId ?? null,
            source: 'system',
            metadata: { wineId, status: doc.status },
          })
        })()

        return doc
      },
    ],
  },
  timestamps: true,
}
