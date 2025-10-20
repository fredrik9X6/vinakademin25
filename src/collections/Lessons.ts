import { CollectionConfig } from 'payload'
import { uploadVideoToMux, deleteAssetFromMux } from '../lib/mux'

export const Lessons: CollectionConfig = {
  slug: 'lessons',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'videoProvider', 'createdAt'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'content',
      type: 'richText',
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
        position: 'sidebar',
      },
    },
    {
      name: 'muxData',
      type: 'group',
      admin: {
        condition: (data) => data.videoProvider === 'mux',
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
        condition: (data) => data.videoProvider !== 'none' && data.videoProvider !== 'mux',
        description: 'YouTube/Vimeo URL or embed code',
      },
    },
    {
      name: 'sourceVideo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (data) => data.videoProvider === 'mux',
        description: 'Upload a video file to process with Mux',
      },
    },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'modules',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'lessonType',
      type: 'select',
      options: [
        { label: 'Video', value: 'video' },
        { label: 'Text/Reading', value: 'text' },
        { label: 'Quiz', value: 'quiz' },
        { label: 'Mixed', value: 'mixed' },
        { label: 'Wine Review', value: 'wineReview' },
      ],
      defaultValue: 'video',
      admin: {
        position: 'sidebar',
        description: 'Primary type of content in this lesson',
      },
    },
    {
      name: 'hasQuiz',
      type: 'checkbox',
      label: 'Has Quiz',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Whether this lesson includes a quiz component',
      },
    },
    // assignedWine retained implicitly by using answer key's wine. If needed later, re-introduce.
    {
      name: 'answerKeyReview',
      type: 'relationship',
      relationTo: 'reviews',
      required: false,
      admin: {
        position: 'sidebar',
        description:
          'Select the canonical WSET answer review for comparison (tip: mark review as Trusted to use it here).',
        condition: (data) => (data as any)?.lessonType === 'wineReview',
      },
      filterOptions: ({ data }: { data: any }) => {
        try {
          const lessonId = data?.id ? String(data.id) : undefined
          if (lessonId) {
            return {
              or: [{ lesson: { equals: lessonId } }, { isTrusted: { equals: true } }],
            } as any
          }
          return { isTrusted: { equals: true } } as any
        } catch {
          return {} as any
        }
      },
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation, previousDoc }) => {
        const { payload } = req

        // Handle Mux video upload
        if (
          doc.videoProvider === 'mux' &&
          doc.sourceVideo &&
          // Only upload on create, or on update when sourceVideo actually changed
          (operation === 'create' ||
            (operation === 'update' &&
              previousDoc &&
              doc.sourceVideo !== previousDoc.sourceVideo)) &&
          // And only if we have not already created a Mux asset for this lesson
          !(doc.muxData && (doc.muxData as any).assetId)
        ) {
          try {
            payload.logger.info(`Processing Mux upload for lesson ${doc.id}`)

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

              // Update the lesson with Mux asset info
              await payload.update({
                collection: 'lessons',
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

              payload.logger.info(`Updated lesson ${doc.id} with Mux data`)
            } else {
              payload.logger.error(`No URL found for media file ${doc.sourceVideo}`)
            }
          } catch (error) {
            // Prevent failing the save; just log the error and continue so the lesson still saves
            payload.logger.error(`Error uploading to Mux for lesson ${doc.id}:`, error)
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
          // Get the lesson to check if it has Mux data
          const lesson = await payload.findByID({
            collection: 'lessons',
            id,
          })

          // Delete from Mux if it exists
          if (lesson.muxData?.assetId) {
            await deleteAssetFromMux(lesson.muxData.assetId)
            payload.logger.info(`Deleted Mux asset for lesson ${id}`)
          }
        } catch (error) {
          payload.logger.error(`Error deleting Mux asset for lesson ${id}:`, error)
        }
      },
    ],
  },
}
