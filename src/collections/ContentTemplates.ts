import type { CollectionConfig } from 'payload'

export const ContentTemplates: CollectionConfig = {
  slug: 'content-templates',
  labels: {
    singular: 'Content Template',
    plural: 'Content Templates',
  },
  admin: {
    group: 'Course Content',
    defaultColumns: ['name', 'type', 'category', 'isActive'],
    useAsTitle: 'name',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Template name for easy identification',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Description of what this template is for',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Video + Quiz', value: 'video-quiz' },
        { label: 'Reading + Exercise', value: 'reading-exercise' },
        { label: 'Interactive Demo', value: 'interactive-demo' },
        { label: 'Case Study', value: 'case-study' },
        { label: 'Lab Exercise', value: 'lab-exercise' },
        { label: 'Discussion Forum', value: 'discussion-forum' },
        { label: 'Assignment', value: 'assignment' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'general',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Introduction', value: 'introduction' },
        { label: 'Core Content', value: 'core-content' },
        { label: 'Practice', value: 'practice' },
        { label: 'Assessment', value: 'assessment' },
        { label: 'Review', value: 'review' },
        { label: 'Advanced', value: 'advanced' },
      ],
    },
    {
      name: 'contentBlocks',
      type: 'blocks',
      required: true,
      admin: {
        description: 'Content blocks that make up this template',
      },
      blocks: [
        {
          slug: 'text-block',
          labels: {
            singular: 'Text Block',
            plural: 'Text Blocks',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'Optional title for this text section',
              },
            },
            {
              name: 'content',
              type: 'richText',
              required: true,
              admin: {
                description: 'Rich text content',
              },
            },
            {
              name: 'style',
              type: 'select',
              defaultValue: 'default',
              options: [
                { label: 'Default', value: 'default' },
                { label: 'Highlight', value: 'highlight' },
                { label: 'Callout', value: 'callout' },
                { label: 'Warning', value: 'warning' },
                { label: 'Info', value: 'info' },
                { label: 'Success', value: 'success' },
              ],
            },
          ],
        },
        {
          slug: 'video-block',
          labels: {
            singular: 'Video Block',
            plural: 'Video Blocks',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'Video title',
              },
            },
            {
              name: 'videoProvider',
              type: 'select',
              defaultValue: 'upload',
              options: [
                { label: 'Upload', value: 'upload' },
                { label: 'YouTube', value: 'youtube' },
                { label: 'Vimeo', value: 'vimeo' },
                { label: 'Mux', value: 'mux' },
              ],
            },
            {
              name: 'videoFile',
              type: 'relationship',
              relationTo: 'media',
              admin: {
                condition: (data) => data.videoProvider === 'upload',
                description: 'Upload video file',
              },
            },
            {
              name: 'videoUrl',
              type: 'text',
              admin: {
                condition: (data) => ['youtube', 'vimeo'].includes(data.videoProvider),
                description: 'YouTube or Vimeo URL',
              },
            },
            {
              name: 'muxPlaybackId',
              type: 'text',
              admin: {
                condition: (data) => data.videoProvider === 'mux',
                description: 'Mux playback ID',
              },
            },
            {
              name: 'thumbnail',
              type: 'relationship',
              relationTo: 'media',
              admin: {
                description: 'Video thumbnail image',
              },
            },
            {
              name: 'description',
              type: 'richText',
              admin: {
                description: 'Video description or transcript',
              },
            },
            {
              name: 'duration',
              type: 'number',
              admin: {
                description: 'Video duration in minutes',
              },
            },
            {
              name: 'autoplay',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'showControls',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
        {
          slug: 'image-gallery',
          labels: {
            singular: 'Image Gallery',
            plural: 'Image Galleries',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'Gallery title',
              },
            },
            {
              name: 'images',
              type: 'array',
              required: true,
              minRows: 1,
              fields: [
                {
                  name: 'image',
                  type: 'relationship',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'caption',
                  type: 'text',
                  admin: {
                    description: 'Image caption',
                  },
                },
                {
                  name: 'alt',
                  type: 'text',
                  admin: {
                    description: 'Alt text for accessibility',
                  },
                },
              ],
            },
            {
              name: 'layout',
              type: 'select',
              defaultValue: 'grid',
              options: [
                { label: 'Grid', value: 'grid' },
                { label: 'Carousel', value: 'carousel' },
                { label: 'Masonry', value: 'masonry' },
              ],
            },
          ],
        },
        {
          slug: 'code-snippet',
          labels: {
            singular: 'Code Snippet',
            plural: 'Code Snippets',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'Code snippet title',
              },
            },
            {
              name: 'language',
              type: 'select',
              defaultValue: 'javascript',
              options: [
                { label: 'JavaScript', value: 'javascript' },
                { label: 'TypeScript', value: 'typescript' },
                { label: 'Python', value: 'python' },
                { label: 'Java', value: 'java' },
                { label: 'C#', value: 'csharp' },
                { label: 'PHP', value: 'php' },
                { label: 'HTML', value: 'html' },
                { label: 'CSS', value: 'css' },
                { label: 'SQL', value: 'sql' },
                { label: 'JSON', value: 'json' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'code',
              type: 'textarea',
              required: true,
              admin: {
                description: 'Code content',
              },
            },
            {
              name: 'explanation',
              type: 'richText',
              admin: {
                description: 'Code explanation or notes',
              },
            },
            {
              name: 'showLineNumbers',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'highlightLines',
              type: 'text',
              admin: {
                description: 'Comma-separated line numbers to highlight (e.g., 1,3,5-7)',
              },
            },
          ],
        },
        {
          slug: 'interactive-element',
          labels: {
            singular: 'Interactive Element',
            plural: 'Interactive Elements',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'Interactive element title',
              },
            },
            {
              name: 'elementType',
              type: 'select',
              required: true,
              options: [
                { label: 'Quiz', value: 'quiz' },
                { label: 'Poll', value: 'poll' },
                { label: 'Survey', value: 'survey' },
                { label: 'Simulation', value: 'simulation' },
                { label: 'Calculator', value: 'calculator' },
                { label: 'Drag & Drop', value: 'drag-drop' },
                { label: 'Embedded Widget', value: 'embedded-widget' },
              ],
            },
            {
              name: 'quiz',
              type: 'relationship',
              relationTo: 'quizzes',
              admin: {
                condition: (data) => data.elementType === 'quiz',
                description: 'Select quiz to embed',
              },
            },
            {
              name: 'embedCode',
              type: 'textarea',
              admin: {
                condition: (data) => data.elementType === 'embedded-widget',
                description: 'Embed code for external widget',
              },
            },
            {
              name: 'configuration',
              type: 'json',
              admin: {
                description: 'Configuration options for the interactive element',
              },
            },
            {
              name: 'instructions',
              type: 'richText',
              admin: {
                description: 'Instructions for using the interactive element',
              },
            },
          ],
        },
        {
          slug: 'download-files',
          labels: {
            singular: 'Download Files',
            plural: 'Download Files',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              admin: {
                description: 'Section title',
              },
            },
            {
              name: 'files',
              type: 'array',
              required: true,
              minRows: 1,
              fields: [
                {
                  name: 'file',
                  type: 'relationship',
                  relationTo: 'media',
                  required: true,
                },
                {
                  name: 'title',
                  type: 'text',
                  admin: {
                    description: 'Display title for the file',
                  },
                },
                {
                  name: 'description',
                  type: 'text',
                  admin: {
                    description: 'File description',
                  },
                },
                {
                  name: 'fileType',
                  type: 'select',
                  options: [
                    { label: 'PDF', value: 'pdf' },
                    { label: 'Word Document', value: 'doc' },
                    { label: 'Excel Spreadsheet', value: 'excel' },
                    { label: 'PowerPoint', value: 'ppt' },
                    { label: 'Image', value: 'image' },
                    { label: 'Video', value: 'video' },
                    { label: 'Audio', value: 'audio' },
                    { label: 'Archive', value: 'archive' },
                    { label: 'Other', value: 'other' },
                  ],
                },
              ],
            },
            {
              name: 'requiresLogin',
              type: 'checkbox',
              defaultValue: true,
              admin: {
                description: 'Require user to be logged in to download',
              },
            },
          ],
        },
        {
          slug: 'assignment-block',
          labels: {
            singular: 'Assignment Block',
            plural: 'Assignment Blocks',
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              admin: {
                description: 'Assignment title',
              },
            },
            {
              name: 'instructions',
              type: 'richText',
              required: true,
              admin: {
                description: 'Assignment instructions',
              },
            },
            {
              name: 'dueDate',
              type: 'date',
              admin: {
                description: 'Assignment due date',
              },
            },
            {
              name: 'maxPoints',
              type: 'number',
              defaultValue: 100,
              admin: {
                description: 'Maximum points for this assignment',
              },
            },
            {
              name: 'submissionType',
              type: 'select',
              defaultValue: 'text',
              options: [
                { label: 'Text Entry', value: 'text' },
                { label: 'File Upload', value: 'file' },
                { label: 'Both', value: 'both' },
              ],
            },
            {
              name: 'allowedFileTypes',
              type: 'text',
              admin: {
                condition: (data) => ['file', 'both'].includes(data.submissionType),
                description: 'Allowed file types (e.g., .pdf, .docx, .txt)',
              },
            },
            {
              name: 'maxFileSize',
              type: 'number',
              defaultValue: 10,
              admin: {
                condition: (data) => ['file', 'both'].includes(data.submissionType),
                description: 'Maximum file size in MB',
              },
            },
            {
              name: 'rubric',
              type: 'richText',
              admin: {
                description: 'Assignment rubric or grading criteria',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'estimatedDuration',
          type: 'number',
          admin: {
            description: 'Estimated time to complete in minutes',
          },
        },
        {
          name: 'difficulty',
          type: 'select',
          defaultValue: 'intermediate',
          options: [
            { label: 'Beginner', value: 'beginner' },
            { label: 'Intermediate', value: 'intermediate' },
            { label: 'Advanced', value: 'advanced' },
          ],
        },
        {
          name: 'prerequisites',
          type: 'array',
          admin: {
            description: 'Prerequisites for using this template',
          },
          fields: [
            {
              name: 'prerequisite',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'tags',
          type: 'array',
          admin: {
            description: 'Tags for categorizing this template',
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
    },
    {
      name: 'metadata',
      type: 'group',
      fields: [
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            description: 'Template author',
          },
        },
        {
          name: 'version',
          type: 'text',
          defaultValue: '1.0.0',
          admin: {
            description: 'Template version',
          },
        },
        {
          name: 'lastUpdated',
          type: 'date',
          admin: {
            description: 'Last updated date',
          },
        },
        {
          name: 'usageCount',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
            description: 'Number of times this template has been used',
          },
        },
        {
          name: 'rating',
          type: 'number',
          min: 1,
          max: 5,
          admin: {
            description: 'Template rating (1-5 stars)',
          },
        },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this template is active and available for use',
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this template is publicly available to all users',
      },
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Ensure data exists
        if (!data) {
          return data
        }

        // Auto-update lastUpdated when template is modified
        if (operation === 'update') {
          data.metadata = data.metadata || {}
          data.metadata.lastUpdated = new Date()
        }

        // Set author on creation if not set
        if (operation === 'create' && !data.metadata?.author && req?.user) {
          data.metadata = data.metadata || {}
          data.metadata.author = req.user.id
        }

        return data
      },
    ],
  },
}
