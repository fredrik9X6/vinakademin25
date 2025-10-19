import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOrInstructorOnly, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'
import { uploadVideoToMux, deleteAssetFromMux } from '../lib/mux'

export const Courses: CollectionConfig = {
  slug: 'courses',
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
    read: ({ req }) => {
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      return {
        _status: { equals: 'published' },
      }
    },
    create: adminOrInstructorOnly,
    update: adminOrInstructorOnly,
    delete: adminOnly,
    readVersions: adminOrInstructorOnly,
  },
  hooks: {
    beforeChange: [withCreatedByUpdatedBy],
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
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
          // And only if we have not already created a Mux asset for this course
          !(doc.previewMuxData && (doc.previewMuxData as any).assetId)
        ) {
          try {
            payload.logger.info(`Processing Mux preview video upload for course ${doc.id}`)

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
              const asset = await uploadVideoToMux(fileUrl, `course-preview-${doc.id}`)

              payload.logger.info(`Mux preview asset created:`, {
                id: asset.id,
                status: asset.status,
                playback_ids: asset.playback_ids,
              })

              // Update the course with Mux asset info
              await payload.update({
                collection: 'courses',
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

              payload.logger.info(`Course ${doc.id} updated with Mux preview data`)
            }
          } catch (error: any) {
            payload.logger.error(`Error processing Mux preview video for course ${doc.id}:`, error)
          }
        }
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        const { payload } = req

        // Delete from Mux when course is deleted
        if (doc.previewVideoProvider === 'mux' && doc.previewMuxData?.assetId) {
          try {
            payload.logger.info(
              `Deleting Mux preview asset ${doc.previewMuxData.assetId} for course ${doc.id}`,
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
        description: 'Course title displayed to students',
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
        description: 'Brief description of the course content and goals',
      },
    },
    {
      name: 'fullDescription',
      type: 'richText',
      admin: {
        description: 'Detailed course description with formatting',
      },
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      required: true,
      admin: {
        description: 'Main course image for thumbnails and hero sections',
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
        description: 'Course price in SEK',
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
        description: 'Estimated course duration in hours',
      },
    },
    {
      name: 'freeItemCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description:
          'Number of items (lessons + quizzes) available for free (counted across all modules in order)',
      },
    },
    {
      name: 'isFeatured',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Display this course prominently on homepage and course listing',
      },
    },
    {
      name: 'instructor',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Course instructor',
      },
    },
    {
      name: 'modules',
      type: 'relationship',
      relationTo: 'modules',
      hasMany: true,
      admin: {
        description: 'Course modules in order',
      },
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
        description: 'Course tags for search and filtering',
      },
    },
    // Stripe Integration Fields
    {
      name: 'stripeProductId',
      type: 'text',
      admin: {
        description: 'Stripe Product ID for this course',
        readOnly: true,
        condition: (data) => Boolean(data?.stripeProductId),
      },
    },
    {
      name: 'stripePriceId',
      type: 'text',
      admin: {
        description: 'Stripe Price ID for this course',
        readOnly: true,
        condition: (data) => Boolean(data?.stripePriceId),
      },
    },
  ],
}
