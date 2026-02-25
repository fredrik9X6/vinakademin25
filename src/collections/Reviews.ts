import type { CollectionConfig } from 'payload'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: {
    group: 'Wine Library',
    useAsTitle: 'title',
    defaultColumns: ['title', 'wine', 'user', 'rating', 'isTrusted', 'createdAt'],
    description: 'User reviews for wines, including WSET tasting notes',
  },
  access: {
    // Bare minimum access control - simplified
    read: ({ req }) => {
      // Admin/instructor can read all
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      // Users can read their own reviews
      if (req.user) {
        return { user: { equals: req.user.id } } as any
      }
      // Public can read trusted reviews
      return { isTrusted: { equals: true } } as any
    },
    create: ({ req }) => Boolean(req.user),
    // Allow update for form building
    update: () => true,
    delete: ({ req }) => req.user?.role === 'admin',
  },

  hooks: {
    beforeChange: [
      async ({ req, operation, data, originalDoc }) => {
        // Always return data early if form building (no user context)
        if (!req.user) return data
        
        // Only validate actual operations
        if (operation !== 'update' && operation !== 'create') return data
        
        const user = req.user
        
        // For CREATE operations: ensure isTrusted is false for non-admins
        if (operation === 'create') {
          if (data?.isTrusted === true && user.role !== 'admin' && user.role !== 'instructor') {
            // Silently set to false instead of throwing error
            data.isTrusted = false
          }
          return data
        }
        
        // For UPDATE operations only:
        // Enforce isTrusted field restriction - only check if value is actually changing
        if (operation === 'update' && originalDoc && data?.isTrusted !== undefined) {
          const wasTrue = originalDoc.isTrusted === true
          const willBeTrue = data.isTrusted === true
          
          // Only restrict if trying to change the value
          if (wasTrue !== willBeTrue) {
            if (user.role !== 'admin' && user.role !== 'instructor') {
              throw new Error('Only admins and instructors can mark reviews as trusted')
            }
          }
        }
        
        // Admins and instructors can update any review
        if (user.role === 'admin' || user.role === 'instructor') {
          return data
        }
        
        // Users can only update their own reviews
        if (originalDoc && String(user.id) === String(originalDoc.user)) {
          return data
        }
        
        throw new Error('You can only update your own reviews')
      },
      withCreatedByUpdatedBy,
      // Force user field to current user on create
      ({ data, req, operation }) => {
        if (operation === 'create' && data && req.user?.id) {
          return { ...data, user: req.user.id }
        }
        return data
      },
      // Generate title from wine name and rating
      async ({ data, req, operation }) => {
        if (!data) return data
        
        // Generate title from wine name and rating
        if (data.wine) {
          try {
            const wineId = typeof data.wine === 'object' ? data.wine.id : data.wine
            if (wineId) {
              const wine = await req.payload.findByID({
                collection: 'wines',
                id: typeof wineId === 'string' ? parseInt(wineId) : wineId,
                depth: 0,
              })
              
              if (wine?.name) {
                const rating = data.rating
                const stars = rating && typeof rating === 'number' ? '★'.repeat(rating) : ''
                data.title = `${wine.name}${stars ? ` - ${stars}` : ''}`
              }
            }
          } catch (error) {
            // If wine fetch fails, keep existing title or use fallback
            if (!data.title) {
              data.title = `Review #${data.id || 'New'}`
            }
          }
        } else if (!data.title && data.id) {
          // If no wine but we have an ID, use fallback
          data.title = `Review #${data.id}`
        }
        
        return data
      },
    ],
    beforeRead: [
      async ({ doc, req }) => {
        // Ensure title is populated for existing reviews that might not have it
        if (doc && !doc.title && doc.wine) {
          try {
            const wineId = typeof doc.wine === 'object' ? doc.wine.id : doc.wine
            if (wineId) {
              const wine = await req.payload.findByID({
                collection: 'wines',
                id: typeof wineId === 'string' ? parseInt(wineId) : wineId,
                depth: 0,
              })
              
              if (wine?.name) {
                const rating = doc.rating
                const stars = rating && typeof rating === 'number' ? '★'.repeat(rating) : ''
                doc.title = `${wine.name}${stars ? ` - ${stars}` : ''}`
              }
            }
          } catch (error) {
            // Silently fail if wine not found
            if (!doc.title) {
              doc.title = `Review #${doc.id || 'New'}`
            }
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'Auto-generated title combining wine name and rating',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          async ({ data, req, operation }) => {
            // Generate title from wine name and rating
            if (data?.wine && (operation === 'create' || operation === 'update')) {
              try {
                const wineId = typeof data.wine === 'object' ? data.wine.id : data.wine
                if (wineId && req.payload) {
                  const wine = await req.payload.findByID({
                    collection: 'wines',
                    id: typeof wineId === 'string' ? parseInt(wineId) : wineId,
                    depth: 0,
                  })
                  
                  if (wine?.name) {
                    const rating = data.rating
                    const stars = rating && typeof rating === 'number' ? '★'.repeat(rating) : ''
                    return `${wine.name}${stars ? ` - ${stars}` : ''}`
                  }
                }
              } catch (error) {
                // If wine fetch fails, return fallback
                console.error('Error generating review title:', error)
              }
            }
            
            // Return existing title or fallback
            return data?.title || `Review #${data?.id || 'New'}`
          },
        ],
      },
    },
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      required: true,
      admin: { description: 'The wine being reviewed' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      admin: {
        description: 'User who wrote the review',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'sessionParticipant',
      type: 'relationship',
      relationTo: 'session-participants',
      required: false,
      admin: {
        description: 'Session participant who submitted this review (for guest reviews)',
        position: 'sidebar',
      },
    },
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'course-sessions',
      required: false,
      admin: {
        description: 'Session this review was submitted in (for group tastings)',
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
        description: 'User who created this review',
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
        description: 'User who last updated this review',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'rating',
      type: 'number',
      label: 'Betyg',
      min: 1,
      max: 5,
      required: true,
      admin: { description: 'User rating from 1-5' },
    },
    {
      name: 'reviewText',
      type: 'richText',
      label: 'Recensionstext',
      admin: { description: 'User review text' },
    },
    {
      name: 'isTrusted',
      type: 'checkbox',
      label: 'Trusted Review',
      defaultValue: false,
      admin: {
        description: 'Mark as trusted (admins/instructors only)',
        readOnly: false,
        position: 'sidebar',
      },
      access: {
        // Allow form building, but enforce at collection level via beforeChange hook
        read: () => true,
        update: () => true,
      },
    },
    // WSET Tasting Protocol
    {
      name: 'wsetTasting',
      type: 'group',
      label: 'WSET Provningsprotokoll',
      admin: { description: 'WSET systematiskt provningsprotokoll' },
      fields: [
        {
          name: 'appearance',
          type: 'group',
          label: 'Utseende',
          fields: [
            { name: 'clarity', type: 'select', label: 'Klarhet', options: ['Klar', 'Oklar'] },
            {
              name: 'intensity',
              type: 'select',
              label: 'Intensitet',
              options: ['Blek', 'Mellan', 'Djup'],
            },
            {
              name: 'color',
              type: 'select',
              label: 'färg',
              options: [
                'Citrongul',
                'Guld',
                'Bärnstensfärgad',
                'Rosa',
                'Rosa-orange',
                'Orange',
                'Lila',
                'Rubinröd',
                'Granatröd',
                'Läderfärgad',
              ],
            },
          ],
        },
        {
          name: 'nose',
          type: 'group',
          label: 'Doft',
          fields: [
            {
              name: 'intensity',
              type: 'select',
              label: 'Intensitet',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'primaryAromas',
              type: 'select',
              label: 'Primära aromer',
              hasMany: true,
              options: [
                'Jordgubbe',
                'Päron',
                'Persika',
                'Apelsin',
                'Citron',
                'Äpple',
                'Krusbär',
                'Grapefrukt',
                'Druva',
                'Lime',
                'Aprikos',
                'Banan',
                'Nektarin',
                'Litchi',
                'Mango',
                'Passionsfrukt',
                'Melon',
                'Ananas',
                'Tranbär',
                'Röda vinbär',
                'Hallon',
                'Röda körsbär',
                'Svarta vinbär',
                'Björnbär',
                'Mörka körsbär',
                'Blåbär',
                'Mörka plommon',
                'Röda plommon',
                'Blomma',
                'Ros',
                'Viol',
                'Grön paprika',
                'Gräs',
                'Tomatblad',
                'Sparris',
                'Eukalyptus',
                'Mynta',
                'Fänkål',
                'Dill',
                'Torkade örter',
                'Svart- & Vitpeppar',
                'Lakrits',
                'Omogen frukt',
                'Mogen frukt',
                'Blöta stenar',
              ],
            },
            {
              name: 'secondaryAromas',
              type: 'select',
              label: 'Sekundära aromer',
              hasMany: true,
              options: [
                'Vanilj',
                'Ceder',
                'Kex',
                'Bröd',
                'Bröddeg',
                'yoghurt',
                'Grädde',
                'Smör',
                'Ost',
                'Kokosnöt',
                'Förkolnat trä',
                'Rök',
                'Godis',
                'Bakverk',
                'Rostat bröd',
                'Kryddnejlika',
                'Kanel',
                'Muskot',
                'Ingefära',
                'Kokt frukt',
                'Kaffe',
              ],
            },
            {
              name: 'tertiaryAromas',
              type: 'select',
              label: 'Tertiära aromer',
              hasMany: true,
              options: [
                'Choklad',
                'Läder',
                'Kola',
                'Jord',
                'Svamp',
                'Kött',
                'Tobak',
                'Blöta löv',
                'Skogsbotten',
                'Apelsinmarmelad',
                'Bensin',
                'Mandel',
                'Hasselnöt',
                'Honung',
                'Torkad frukt',
              ],
            },
          ],
        },
        {
          name: 'palate',
          type: 'group',
          label: 'Smak',
          fields: [
            {
              name: 'sweetness',
              type: 'select',
              label: 'Sötma',
              options: ['Torr', 'Halvtorr', 'Mellan', 'Söt'],
            },
            {
              name: 'acidity',
              type: 'select',
              label: 'Syra',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'tannin',
              type: 'select',
              label: 'Tannin',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'alcohol',
              type: 'select',
              label: 'Alkohol',
              options: ['Låg', 'Mellan', 'Hög'],
            },
            {
              name: 'body',
              type: 'select',
              label: 'Fyllighet',
              options: ['Lätt', 'Mellan', 'Fyllig'],
            },
            {
              name: 'flavourIntensity',
              type: 'select',
              label: 'Smakintensitet',
              options: ['Låg', 'Medium', 'Uttalad'],
            },
            {
              name: 'primaryFlavours',
              type: 'select',
              label: 'Primära smaker',
              hasMany: true,
              options: [
                'Jordgubbe',
                'Päron',
                'Persika',
                'Apelsin',
                'Citron',
                'Äpple',
                'Krusbär',
                'Grapefrukt',
                'Druva',
                'Lime',
                'Aprikos',
                'Banan',
                'Nektarin',
                'Litchi',
                'Mango',
                'Passionsfrukt',
                'Melon',
                'Ananas',
                'Tranbär',
                'Röda vinbär',
                'Hallon',
                'Röda körsbär',
                'Svarta vinbär',
                'Björnbär',
                'Mörka körsbär',
                'Blåbär',
                'Mörka plommon',
                'Röda plommon',
                'Blomma',
                'Ros',
                'Viol',
                'Grön paprika',
                'Gräs',
                'Tomatblad',
                'Sparris',
                'Eukalyptus',
                'Mynta',
                'Fänkål',
                'Dill',
                'Torkade örter',
                'Svart- & Vitpeppar',
                'Lakrits',
                'Omogen frukt',
                'Mogen frukt',
                'Blöta stenar',
              ],
            },
            {
              name: 'secondaryFlavours',
              type: 'select',
              label: 'Sekundära smaker',
              hasMany: true,
              options: [
                'Vanilj',
                'Ceder',
                'Kex',
                'Bröd',
                'Bröddeg',
                'yoghurt',
                'Grädde',
                'Smör',
                'Ost',
                'Kokosnöt',
                'Förkolnat trä',
                'Rök',
                'Godis',
                'Bakverk',
                'Rostat bröd',
                'Kryddnejlika',
                'Kanel',
                'Muskot',
                'Ingefära',
                'Kokt frukt',
                'Kaffe',
              ],
            },
            {
              name: 'tertiaryFlavours',
              type: 'select',
              label: 'Tertiära smaker',
              hasMany: true,
              options: [
                'Choklad',
                'Läder',
                'Kola',
                'Jord',
                'Svamp',
                'Kött',
                'Tobak',
                'Blöta löv',
                'Skogsbotten',
                'Apelsinmarmelad',
                'Bensin',
                'Mandel',
                'Hasselnöt',
                'Honung',
                'Torkad frukt',
              ],
            },
            {
              name: 'finish',
              type: 'select',
              label: 'Eftersmak',
              options: ['Kort', 'Mellan', 'Lång'],
            },
          ],
        },
        {
          name: 'conclusion',
          type: 'group',
          label: 'Slutsats',
          fields: [
            {
              name: 'quality',
              type: 'select',
              label: 'Kvalitet',
              options: ['Dålig', 'Acceptabel', 'Bra', 'Mycket bra', 'Enastående'],
            },

            { name: 'summary', type: 'textarea', label: 'Sammanfattning/Noteringar' },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
