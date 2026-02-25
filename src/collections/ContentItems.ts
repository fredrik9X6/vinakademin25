import type { CollectionConfig } from 'payload'
import { deleteAssetFromMux } from '../lib/mux'

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
      if (!req.user) return true // form building
      return req.user.role === 'admin' || req.user.role === 'instructor'
    },
    update: ({ req }) => {
      if (!req.user) return true // form building
      return req.user.role === 'admin' || req.user.role === 'instructor'
    },
    delete: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'instructor' || false,
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
        {
          name: 'errorMessage',
          type: 'text',
          admin: {
            description: 'Error details if video processing failed',
            readOnly: true,
            condition: (_data, siblingData) => siblingData?.status === 'errored',
          },
        },
      ],
    },
    // Mux Direct Upload UI field
    {
      name: 'muxUploader',
      type: 'ui',
      admin: {
        condition: (data) => data.contentType === 'lesson' && data.videoProvider === 'mux',
        components: {
          Field: '/components/admin/MuxDirectUploadField.tsx#MuxDirectUploadField',
        },
      },
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
    // Keep sourceVideo for backward compatibility with existing S3-based videos
    {
      name: 'sourceVideo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: () => false, // Hidden — use Mux Direct Upload instead
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
    afterDelete: [
      async ({ doc, req }) => {
        const { payload } = req

        try {
          if (doc.contentType === 'lesson' && doc.muxData?.assetId) {
            await deleteAssetFromMux(doc.muxData.assetId)
            payload.logger.info(`Deleted Mux asset for content item ${doc.id}`)
          }
        } catch (error) {
          payload.logger.error(`Error deleting Mux asset for content item ${doc.id}:`, error)
        }
      },
    ],
  },
  timestamps: true,
}
