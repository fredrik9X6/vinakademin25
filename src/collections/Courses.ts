import type { CollectionConfig } from 'payload'
import { withCreatedByUpdatedBy } from '../lib/hooks'
import { uploadVideoToMux, deleteAssetFromMux } from '../lib/mux'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { BlocksFeature, UploadFeature } from '@payloadcms/richtext-lexical'
import { WineReference, WineList, NewsletterSignup, CourseReference } from '../components/blocks'

export const Vinprovningar: CollectionConfig = {
  slug: 'vinprovningar',
  labels: {
    singular: 'Wine tasting',
    plural: 'Wine tastings',
  },
  admin: {
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
    // Bare minimum access control
    read: ({ req }) => {
      // Admin/instructor can read all
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      // Allow form building (no user context)
      if (!req.user) return true
      // Public can read published
      return {
        _status: { equals: 'published' },
      }
    },
    create: ({ req }) => {
      // Allow form building (no user context)
      if (!req.user) return true
      return req.user?.role === 'admin' || req.user?.role === 'instructor'
    },
    // Allow update for form building - security handled in hooks
    update: () => true,
    delete: ({ req }) => req.user?.role === 'admin',
    readVersions: ({ req }) => {
      // Allow form building (no user context)
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

        // Handle Mux preview video upload
        if (
          doc.previewVideoProvider === 'mux' &&
          doc.previewSourceVideo &&
          // Only upload on create, or on update when previewSourceVideo actually changed
          (operation === 'create' ||
            (operation === 'update' &&
              previousDoc &&
              doc.previewSourceVideo !== previousDoc.previewSourceVideo)) &&
          // And only if we have not already created a Mux asset for this wine tasting
          !(doc.previewMuxData && (doc.previewMuxData as any).assetId)
        ) {
          try {
            payload.logger.info(`Processing Mux preview video upload for wine tasting ${doc.id}`)

            // Get the uploaded media file
            const media = await payload.findByID({
              collection: 'media',
              id: doc.previewSourceVideo,
            })

            payload.logger.info(`Found media file:`, {
              id: media?.id,
              filename: media?.filename,
              url: media?.url,
            })

            if (media?.url) {
              // For development, use ngrok URL so Mux can download the file
              const baseUrl =
                process.env.NODE_ENV === 'production'
                  ? process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
                  : process.env.NGROK_URL || 'http://localhost:3000'

              const fileUrl = media.url.startsWith('http') ? media.url : `${baseUrl}${media.url}`

              payload.logger.info(`Uploading preview video to Mux with URL: ${fileUrl}`)

              // Upload to Mux
              const asset = await uploadVideoToMux(fileUrl, `vinprovning-preview-${doc.id}`)

              payload.logger.info(`Mux preview asset created:`, {
                id: asset.id,
                status: asset.status,
                playback_ids: asset.playback_ids,
              })

              // Update the wine tasting with Mux asset info
              await payload.update({
                collection: 'vinprovningar',
                id: String(doc.id),
                data: {
                  previewMuxData: {
                    assetId: asset.id,
                    playbackId: asset.playback_ids?.[0]?.id || '',
                    status: asset.status as 'preparing' | 'ready' | 'errored',
                    duration: asset.duration || 0,
                    aspectRatio: asset.aspect_ratio || '16:9',
                  },
                },
              })

              payload.logger.info(`Wine tasting ${doc.id} updated with Mux preview data`)
            }
          } catch (error: any) {
            payload.logger.error(`Error processing Mux preview video for wine tasting ${doc.id}:`, error)
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
            blocks: [WineList, WineReference, NewsletterSignup, CourseReference],
          }),
          UploadFeature({
            collections: {
              media: {
                fields: [
                  {
                    name: 'imageLayout',
                    type: 'select',
                    defaultValue: 'medium',
                    options: [
                      { label: 'Icon (100px)', value: 'icon' },
                      { label: 'Thumbnail (150px)', value: 'thumbnail' },
                      { label: 'Small (300px)', value: 'small' },
                      { label: 'Medium (600px)', value: 'medium' },
                      { label: 'Large (900px)', value: 'large' },
                      { label: 'Full Width', value: 'full' },
                    ],
                    admin: {
                      description: 'Choose image size for display',
                    },
                  },
                  {
                    name: 'imageAlignment',
                    type: 'select',
                    defaultValue: 'center',
                    options: [
                      { label: 'Left', value: 'left' },
                      { label: 'Center', value: 'center' },
                      { label: 'Right', value: 'right' },
                    ],
                    admin: {
                      description: 'Image alignment within the content',
                    },
                  },
                  {
                    name: 'imageCaption',
                    type: 'text',
                    admin: {
                      description: 'Optional caption to display below the image',
                    },
                  },
                  {
                    name: 'imageBorder',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                      description: 'Add a subtle border around the image',
                    },
                  },
                  {
                    name: 'imageShadow',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                      description: 'Add a drop shadow to the image',
                    },
                  },
                ],
              },
            },
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
          defaultValue: 'preparing',
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
    {
      name: 'previewSourceVideo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (data) => data.previewVideoProvider === 'mux',
        description: 'Upload a preview video file to process with Mux',
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
        description: 'Ordered modules for this wine tasting',
      },
      fields: [
        {
          name: 'module',
          type: 'relationship',
          relationTo: 'modules',
          required: true,
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          defaultValue: 0,
          admin: {
            description: 'Order of this module within the wine tasting',
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
        description: 'Stripe Product ID for this wine tasting',
        readOnly: true,
        condition: (data) => Boolean(data?.stripeProductId),
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'Stripe Price ID for this wine tasting',
        readOnly: true,
        condition: (data) => Boolean(data?.stripePriceId),
      },
    },
  ],
}
