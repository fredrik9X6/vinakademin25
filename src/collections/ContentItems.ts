import type { CollectionConfig } from 'payload'
import { uploadVideoToMux, deleteAssetFromMux } from '../lib/mux'

export const ContentItems: CollectionConfig = {
  slug: 'content-items',
  labels: {
    singular: 'Content Item',
    plural: 'Content Items',
  },
  admin: {
    group: 'Wine Tastings',
    useAsTitle: 'title',
    defaultColumns: ['title', 'contentType', 'status', 'createdAt'],
    description: 'Learning content items - lessons and quizzes',
  },
  access: {
    read: () => true,
    create: ({ req }) => {
      // Allow form building (no user context) for inline creation
      if (!req.user) return true
      return !!req.user
    },
    update: ({ req }) => {
      // Allow form building (no user context)
      if (!req.user) return true
      return !!req.user
    },
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'contentType',
      type: 'select',
      required: true,
      options: [
        { label: '📚 Lesson', value: 'lesson' },
        { label: '📝 Quiz', value: 'quiz' },
      ],
      defaultValue: 'lesson',
      admin: {
        description: 'Type of content item',
        position: 'sidebar',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        condition: (data) => data.contentType === 'lesson',
        description: 'Lesson description',
      },
    },
    // Lesson-specific fields
    {
      name: 'content',
      type: 'richText',
      admin: {
        condition: (data) => data.contentType === 'lesson',
        description: 'Lesson content',
      },
    },
    {
      name: 'videoProvider',
      type: 'select',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Mux', value: 'mux' },
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
      ],
      defaultValue: 'none',
      admin: {
        condition: (data) => data.contentType === 'lesson',
        position: 'sidebar',
      },
    },
    {
      name: 'muxData',
      type: 'group',
      admin: {
        condition: (data) => data.contentType === 'lesson' && data.videoProvider === 'mux',
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
      name: 'videoUrl',
      type: 'text',
      admin: {
        condition: (data) =>
          data.contentType === 'lesson' && data.videoProvider !== 'none' && data.videoProvider !== 'mux',
        description: 'YouTube/Vimeo URL or embed code',
      },
    },
    {
      name: 'sourceVideo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (data) => data.contentType === 'lesson' && data.videoProvider === 'mux',
        description: 'Upload a video file to process with Mux',
      },
    },
    {
      name: 'lessonType',
      type: 'select',
      options: [
        { label: 'Video', value: 'video' },
        { label: 'Text/Reading', value: 'text' },
        { label: 'Mixed', value: 'mixed' },
        { label: 'Wine Review', value: 'wineReview' },
      ],
      defaultValue: 'video',
      admin: {
        condition: (data) => data.contentType === 'lesson',
        position: 'sidebar',
        description: 'Primary type of content in this lesson',
      },
    },
    {
      name: 'answerKeyReview',
      type: 'relationship',
      relationTo: 'reviews',
      required: false,
      admin: {
        condition: (data) => data.contentType === 'lesson' && (data as any)?.lessonType === 'wineReview',
        position: 'sidebar',
        description:
          'Select the canonical WSET answer review for comparison (tip: mark review as Trusted to use it here).',
      },
      filterOptions: ({ data }: { data: any }) => {
        try {
          // Only show trusted reviews (answer keys) for selection
          // Content items reference reviews, not the other way around
          return { isTrusted: { equals: true } } as any
        } catch {
          return {} as any
        }
      },
    },
    // Quiz-specific fields
    {
      name: 'questions',
      type: 'array',
      required: false,
      minRows: 0,
      admin: {
        condition: (data) => data.contentType === 'quiz',
        description: 'Questions in this quiz (drag and drop to reorder)',
      },
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'questions',
          required: true,
        },
        {
          name: 'required',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Whether this question is required',
          },
        },
      ],
    },
    {
      name: 'quizSettings',
      type: 'group',
      admin: {
        condition: (data) => data.contentType === 'quiz',
      },
      fields: [
        {
          name: 'passingScore',
          type: 'number',
          required: true,
          defaultValue: 70,
          min: 0,
          max: 100,
          admin: {
            description: 'Minimum percentage score to pass',
          },
        },
        {
          name: 'randomizeQuestions',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Randomize question order for each attempt',
          },
        },
        {
          name: 'randomizeAnswers',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Randomize answer order for multiple choice questions',
          },
        },
        {
          name: 'showCorrectAnswers',
          type: 'select',
          defaultValue: 'after-submission',
          options: [
            { label: 'Never', value: 'never' },
            { label: 'After Each Question', value: 'after-question' },
            { label: 'After Submission', value: 'after-submission' },
            { label: 'After All Attempts', value: 'after-all-attempts' },
          ],
        },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      admin: {
        condition: (data) => data.contentType === 'quiz',
        description: 'Quiz analytics and statistics',
      },
      fields: [
        {
          name: 'totalAttempts',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Total number of attempts across all students',
          },
        },
        {
          name: 'averageScore',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Average score across all attempts',
          },
        },
        {
          name: 'passRate',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Percentage of students who passed',
          },
        },
        {
          name: 'averageTimeSpent',
          type: 'number',
          admin: {
            readOnly: true,
            description: 'Average time spent in minutes',
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        const { payload } = req

        // Handle Mux video upload for lessons
        if (
          doc.contentType === 'lesson' &&
          doc.videoProvider === 'mux' &&
          doc.sourceVideo &&
          // Only upload on create, or on update when sourceVideo actually changed
          (operation === 'create' ||
            (operation === 'update' &&
              previousDoc &&
              doc.sourceVideo !== previousDoc.sourceVideo)) &&
          // And only if we have not already created a Mux asset for this item
          !(doc.muxData && (doc.muxData as any).assetId)
        ) {
          try {
            payload.logger.info(`Processing Mux upload for content item ${doc.id}`)

            // Get the uploaded media file
            const media = await payload.findByID({
              collection: 'media',
              id: doc.sourceVideo,
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

              payload.logger.info(`Uploading to Mux with URL: ${fileUrl}`)

              // Upload to Mux
              const asset = await uploadVideoToMux(fileUrl, String(doc.id))

              payload.logger.info(`Mux asset created:`, {
                id: asset.id,
                status: asset.status,
                playback_ids: asset.playback_ids,
              })

              // Update the content item with Mux asset info
              await payload.update({
                collection: 'content-items',
                id: String(doc.id),
                data: {
                  muxData: {
                    assetId: asset.id,
                    playbackId: Array.isArray(asset.playback_ids)
                      ? asset.playback_ids[0]?.id
                      : undefined,
                    status: 'preparing',
                  },
                },
              })

              payload.logger.info(`Updated content item ${doc.id} with Mux data`)
            } else {
              payload.logger.error(`No URL found for media file ${doc.sourceVideo}`)
            }
          } catch (error) {
            // Prevent failing the save; just log the error and continue so the item still saves
            payload.logger.error(`Error uploading to Mux for content item ${doc.id}:`, error)
            try {
              const errObj =
                error && typeof error === 'object'
                  ? JSON.parse(JSON.stringify(error as any))
                  : { value: String(error) }
              payload.logger.error('Error (serialized):', errObj)
            } catch {}
            if (error instanceof Error) {
              payload.logger.error(`Error details:`, {
                name: error.name,
                message: error.message,
                stack: error.stack,
              })
            }
          }
        }

        return doc
      },
    ],
    beforeDelete: [
      async ({ req, id }) => {
        const { payload } = req

        try {
          // Get the content item to check if it has Mux data
          const item = await payload.findByID({
            collection: 'content-items',
            id,
          })

          // Delete from Mux if it exists
          if (item.contentType === 'lesson' && item.muxData?.assetId) {
            await deleteAssetFromMux(item.muxData.assetId)
            payload.logger.info(`Deleted Mux asset for content item ${id}`)
          }
        } catch (error) {
          payload.logger.error(`Error deleting Mux asset for content item ${id}:`, error)
        }
      },
    ],
  },
  timestamps: true,
}

