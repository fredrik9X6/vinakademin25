import type { CollectionConfig } from 'payload'
import { fillBlindAnswersFromSystembolaget } from '../lib/systembolaget-blind-answers'

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
        // ── Richer per-wine info (2026-06). All optional. Top-level on the
        // entry so they apply to both library and custom wines.
        {
          name: 'abv',
          type: 'number',
          min: 0,
          max: 25,
          admin: { description: 'Alkoholhalt i procent (frivilligt).' },
        },
        {
          name: 'servingTemp',
          type: 'text',
          admin: { description: 'Serveringstemperatur, t.ex. "8–10 °C" (frivilligt).' },
        },
        {
          name: 'guestDescription',
          type: 'textarea',
          admin: { description: 'Beskrivning som visas för gästerna (vid avslöjande).' },
        },
        {
          name: 'foodPairing',
          type: 'text',
          admin: { description: 'Föreslagen mat till vinet (visas för gästerna).' },
        },
        // ── Blind-tasting answers. Mirror of TastingPlans.wines — the
        // from-template clone copies them onto the plan so template-based
        // tastings get country/grape guessing without per-plan data entry.
        // All optional. Empty field = that scoring tier is disabled.
        {
          name: 'blindAnswerCountry',
          type: 'text',
          admin: { description: 'Land som rätt svar i blind provning (frivilligt).' },
        },
        {
          name: 'blindAnswerGrapes',
          type: 'text',
          hasMany: true,
          admin: {
            description:
              'Acceptabla druvor som rätt svar (frivilligt). Lägg till flera för blends — gäster får poäng om de gissar någon av dem.',
          },
        },
        {
          name: 'blindAnswerPriceBucket',
          type: 'select',
          options: [
            { label: 'Under 100 kr', value: '0_99' },
            { label: '100–149 kr', value: '100_149' },
            { label: '150–199 kr', value: '150_199' },
            { label: '200–249 kr', value: '200_249' },
            { label: '250–299 kr', value: '250_299' },
            { label: '300+ kr', value: '300_plus' },
          ],
          admin: {
            description:
              'Prisintervall som rätt svar. Lämna tom så härleds det från vinets pris (om satt).',
          },
        },
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
        { label: 'Fri – alla kan se utan köp', value: 'free' },
        { label: 'Betald – kräver köp eller prenumeration', value: 'paid' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Fri = helt öppen, syns även för utloggade besökare (standard). Kräver konto = besökaren måste skapa ett gratiskonto för att se vinerna. Sedan 2026-08-19 är allt gratis — detta styr bara om innehållet är publikt eller kräver inloggning.',
      },
    },
    {
      name: 'priceSek',
      type: 'number',
      required: true,
      defaultValue: 99,
      min: 0,
      admin: {
        position: 'sidebar',
        description:
          'PAUSAD 2026-08-19 — mallar säljs inte längre. Fältet finns kvar för att kunna återuppta försäljning utan migration.',
      },
    },
    {
      name: 'isFreeTrial',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'PAUSAD 2026-08-19 — alla mallar är gratis, så "prova gratis" har ingen effekt längre.',
      },
    },
    {
      name: 'stripeProductId',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-generated via syncTemplateWithStripe when the template is published with a price.',
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Auto-generated. Stripe Prices are immutable — old prices get archived when priceSek changes.',
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
      // Systembolaget wines auto-derive their blind-guess answers from the
      // catalog on every save (only fills EMPTY fields — author values win).
      async ({ data, req }) => {
        if (!data?.wines || !Array.isArray(data.wines)) return data
        const { changed, wines } = await fillBlindAnswersFromSystembolaget(
          req.payload,
          data.wines,
        )
        return changed ? { ...data, wines } : data
      },
    ],
    afterChange: [
      async ({ doc }) => {
        if (!doc) return doc
        // Stripe sync removed 2026-08-19 — templates are free (lead magnet).
        // syncTemplateWithStripe() is intentionally still exported from
        // ../lib/stripe-products for a future re-enable.
        return doc
      },
    ],
  },
  timestamps: true,
}
