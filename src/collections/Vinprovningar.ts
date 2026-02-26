import type { CollectionConfig } from 'payload'
import { withCreatedByUpdatedBy } from '../lib/hooks'
import { deleteAssetFromMux } from '../lib/mux'
import { syncCourseWithStripe } from '../lib/stripe-products'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { BlocksFeature } from '@payloadcms/richtext-lexical'
import { WineReference, WineList, NewsletterSignup } from '../components/blocks'

export const Vinprovningar: CollectionConfig = {
  slug: 'vinprovningar',
  labels: {
    singular: 'Wine tasting',
    plural: 'Wine tastings',
  },
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title', 'level', 'price', '_status'],
    description: 'Wine education courses offered on the platform',
    livePreview: {
      url: ({ data }) => {
        return `${process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/vinprovningar/${data.slug}`
      },
    },
  },
  // Enable versions, drafts, and autosave
  versions: {
    maxPerDoc: 30,
    drafts: {
      autosave: {
        interval: 3000, // Auto-save every 3 seconds
      },
    },
  },
  access: {
    // Access control that handles both form building and authenticated operations
    read: ({ req, id }) => {
      // Admin/instructor can read all
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      // Allow form building (no user context) - Access Operation or form state building
      if (!req.user) return true
      // Public can read published
      return {
        _status: { equals: 'published' },
      }
    },
    create: ({ req }) => {
      // Allow form building (no user context) - Access Operation or form state building
      if (!req.user) return true
      return req.user?.role === 'admin' || req.user?.role === 'instructor'
    },
    // Allow update for form building - security handled in hooks
    update: () => true,
    delete: ({ req }) => {
      // Only admins can delete, but allow Access Operation check (no user = false is OK)
      return req.user?.role === 'admin' || false
    },
    readVersions: ({ req }) => {
      // Allow form building (no user context) - Access Operation or form state building
      if (!req.user) return true
      return req.user?.role === 'admin' || req.user?.role === 'instructor'
    },
    readDrafts: ({ req }) => {
      // Allow form building (no user context) - Access Operation or form state building
      // Required for draft publishing and form state building
      if (!req.user) return true
      return req.user?.role === 'admin' || req.user?.role === 'instructor'
    },
  },
  hooks: {
    beforeChange: [
      // Validate authentication for actual save operations
      async ({ req, operation, data }) => {
        // Only validate actual saves (create/update), not form building
        if (operation !== 'update' && operation !== 'create') return data
        
        // Allow form building (no user context = UI preparation only)
        if (!req.user) {
          return data
        }
        
        // Log publish operations for debugging
        if (operation === 'update' && data._status === 'published') {
          req.payload.logger.info(`📝 Publishing wine tasting: ${data.id || 'new'}`)
        }
        
        // If user exists, validate role
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
          throw new Error('Only admins and instructors can save wine tastings')
        }
        
        return data
      },
      withCreatedByUpdatedBy,
    ],
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        // Always return doc first - PayloadCMS needs this for form state
        if (!doc) return doc

        const { payload } = req

        // Mux preview video upload is now handled via Mux Direct Uploads (client-side)
        // The webhook at /api/mux/webhook handles updating previewMuxData when processing completes

        // Sync with Stripe when wine tasting is created or updated with a price
        // Sync happens when:
        // 1. Creating a new wine tasting with price > 0, OR
        // 2. Wine tasting doesn't have Stripe IDs yet but has a price, OR
        // 3. Price/title/description changed (to update Stripe product)
        // Only sync when document is published (not draft) to avoid validation issues during editing
        if (doc.price && doc.price > 0 && doc._status === 'published') {
          // Check if we should sync
          const shouldSync =
            operation === 'create' ||
            !doc.stripeProductId ||
            !doc.stripePriceId ||
            (operation === 'update' &&
              previousDoc &&
              (doc.price !== previousDoc.price ||
                doc.title !== previousDoc.title ||
                doc.description !== previousDoc.description))

          if (shouldSync) {
            payload.logger.info(`Syncing wine tasting ${doc.id} with Stripe...`)
            payload.logger.info(`Wine tasting data: title="${doc.title}", price=${doc.price}`)
            
            // IMPORTANT: Run Stripe sync asynchronously to avoid blocking the database transaction
            // This prevents idle-in-transaction timeout errors with Neon/Postgres
            // The sync will complete in the background after the main save finishes
            const docId = String(doc.id)
            const docData = { ...doc } // Clone doc data since it may be garbage collected
            
            setImmediate(async () => {
              try {
                const { productId, priceId } = await syncCourseWithStripe(docId, docData)
                payload.logger.info(`Wine tasting ${docId} synced with Stripe:`, {
                  productId,
                  priceId,
                })
              } catch (error: any) {
                payload.logger.error(`Error syncing wine tasting ${docId} with Stripe:`, error)
                if (error instanceof Error) {
                  payload.logger.error(`Error message: ${error.message}`)
                  payload.logger.error(`Error stack: ${error.stack}`)
                }
              }
            })
          }
        }

        // Always return doc - PayloadCMS needs this for form state management
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const { payload } = req

        // Delete from Mux when wine tasting is deleted
        if (doc.previewVideoProvider === 'mux' && doc.previewMuxData?.assetId) {
          try {
            payload.logger.info(
              `Deleting Mux preview asset ${doc.previewMuxData.assetId} for wine tasting ${doc.id}`,
            )
            await deleteAssetFromMux(doc.previewMuxData.assetId)
            payload.logger.info(`Mux preview asset deleted successfully`)
          } catch (error: any) {
            payload.logger.error(`Error deleting Mux preview asset:`, error)
          }
        }
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
      admin: {
        description: 'Wine tasting title displayed to students',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly version of the title',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      maxLength: 500,
      admin: {
        description: 'Brief description of the wine tasting content and goals',
      },
    },
    {
      name: 'fullDescription',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          BlocksFeature({
            blocks: [WineList, WineReference, NewsletterSignup],
          }),
        ],
      }),
      admin: {
        description:
          'Detailed wine tasting description with rich formatting, wine lists, and custom blocks',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Main wine tasting image for thumbnails and hero sections',
      },
    },
    // Preview Video Fields (Mux)
    {
      name: 'previewVideoProvider',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Mux', value: 'mux' },
      ],
      defaultValue: 'none',
      admin: {
        description: 'Preview video for course overview page',
      },
    },
    {
      name: 'previewMuxData',
      type: 'group',
      admin: {
        condition: (data) => data.previewVideoProvider === 'mux',
      },
      fields: [
        {
          name: 'assetId',
          type: 'text',
          admin: {
            description: 'Mux Asset ID',
            readOnly: true,
          },
        },
        {
          name: 'playbackId',
          type: 'text',
          admin: {
            description: 'Mux Playback ID',
            readOnly: true,
          },
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Preparing', value: 'preparing' },
            { label: 'Ready', value: 'ready' },
            { label: 'Errored', value: 'errored' },
          ],
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'duration',
          type: 'number',
          admin: {
            description: 'Duration in seconds',
            readOnly: true,
          },
        },
        {
          name: 'aspectRatio',
          type: 'text',
          admin: {
            description: 'e.g., 16:9',
            readOnly: true,
          },
        },
      ],
    },
    // Mux Direct Upload UI field for preview video
    {
      name: 'previewMuxUploader',
      type: 'ui',
      admin: {
        condition: (data) => data.previewVideoProvider === 'mux',
        components: {
          Field: '/components/admin/MuxDirectUploadField.tsx#MuxDirectUploadField',
        },
      },
    },
    // Keep previewSourceVideo for backward compatibility but hide from admin
    {
      name: 'previewSourceVideo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: () => false, // Hidden — use Mux Direct Upload instead
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Wine tasting price in SEK',
      },
    },
    {
      name: 'level',
      type: 'select',
      required: true,
      options: [
        { label: 'Beginner', value: 'beginner' },
        { label: 'Intermediate', value: 'intermediate' },
        { label: 'Advanced', value: 'advanced' },
      ],
    },
    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Estimated wine tasting duration in hours',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Display this wine tasting prominently on homepage and listing',
      },
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Wine tasting instructor',
      },
    },
    {
      name: 'modules',
      type: 'array',
      admin: {
        description: 'Ordered modules for this wine tasting. Drag and drop to reorder. Click "Add Module" then select an existing module or create a new one.',
      },
      fields: [
        {
          name: 'module',
          type: 'relationship',
          relationTo: 'modules',
          required: true,
          admin: {
            description: 'Select an existing module or click "+ Create" to create a new one',
            allowCreate: true,
          },
        },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
      admin: {
        description: 'Wine tasting tags for search and filtering',
      },
    },
    // Stripe Integration Fields
    {
      name: 'stripeProductId',
      type: 'text',
      admin: {
        description: 'Stripe Product ID - Auto-generated when wine tasting is published with a price',
        readOnly: true,
        placeholder: 'Will be created automatically when published',
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'Stripe Price ID - Auto-generated when wine tasting is published with a price',
        readOnly: true,
        placeholder: 'Will be created automatically when published',
      },
    },
  ],
}
