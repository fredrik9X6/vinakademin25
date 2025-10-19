import type { CollectionConfig } from 'payload'

export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  labels: {
    singular: 'Quiz',
    plural: 'Quizzes',
  },
  admin: {
    group: 'Course Content',
    defaultColumns: ['title', 'course', 'totalQuestions', 'passingScore', 'timeLimit'],
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Quiz title',
      },
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Quiz description and instructions',
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      admin: {
        description: 'Course this quiz belongs to',
      },
    },
    {
      name: 'module',
      type: 'relationship',
      relationTo: 'modules',
      admin: {
        description: 'Optional: Specific module this quiz belongs to',
      },
    },
    {
      name: 'lesson',
      type: 'relationship',
      relationTo: 'lessons',
      admin: {
        description: 'Optional: Specific lesson this quiz belongs to',
      },
    },
    {
      name: 'questions',
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description: 'Questions in this quiz',
      },
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'questions',
          required: true,
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          defaultValue: 1,
          admin: {
            description: 'Order of this question in the quiz',
          },
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
      fields: [
        {
          name: 'timeLimit',
          type: 'number',
          admin: {
            description: 'Time limit in minutes (0 for no limit)',
          },
        },
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
          name: 'maxAttempts',
          type: 'number',
          defaultValue: 3,
          min: 1,
          admin: {
            description: 'Maximum number of attempts allowed',
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
        {
          name: 'allowReview',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Allow students to review their answers before submission',
          },
        },
        {
          name: 'allowBackNavigation',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Allow students to go back to previous questions',
          },
        },
      ],
    },
    {
      name: 'grading',
      type: 'group',
      fields: [
        {
          name: 'gradingType',
          type: 'select',
          defaultValue: 'automatic',
          options: [
            { label: 'Automatic', value: 'automatic' },
            { label: 'Manual', value: 'manual' },
            { label: 'Mixed', value: 'mixed' },
          ],
        },
        {
          name: 'pointsDistribution',
          type: 'select',
          defaultValue: 'equal',
          options: [
            { label: 'Equal Points', value: 'equal' },
            { label: 'Question Points', value: 'question-based' },
            { label: 'Custom', value: 'custom' },
          ],
        },
        {
          name: 'totalPoints',
          type: 'number',
          admin: {
            description: 'Total points for the quiz (auto-calculated if not set)',
          },
        },
      ],
    },
    {
      name: 'availability',
      type: 'group',
      fields: [
        {
          name: 'availableFrom',
          type: 'date',
          admin: {
            description: 'When the quiz becomes available',
          },
        },
        {
          name: 'availableUntil',
          type: 'date',
          admin: {
            description: 'When the quiz is no longer available',
          },
        },
        {
          name: 'prerequisites',
          type: 'array',
          admin: {
            description: 'Prerequisites that must be completed before taking this quiz',
          },
          fields: [
            {
              name: 'type',
              type: 'select',
              required: true,
              options: [
                { label: 'Course', value: 'course' },
                { label: 'Module', value: 'module' },
                { label: 'Lesson', value: 'lesson' },
                { label: 'Quiz', value: 'quiz' },
              ],
            },
            {
              name: 'item',
              type: 'text',
              required: true,
              admin: {
                description: 'ID of the prerequisite item',
              },
            },
            {
              name: 'minScore',
              type: 'number',
              admin: {
                description: 'Minimum score required (for quiz prerequisites)',
              },
            },
          ],
        },
      ],
    },
    {
      name: 'feedback',
      type: 'group',
      fields: [
        {
          name: 'passMessage',
          type: 'richText',
          admin: {
            description: 'Message shown when student passes the quiz',
          },
        },
        {
          name: 'failMessage',
          type: 'richText',
          admin: {
            description: 'Message shown when student fails the quiz',
          },
        },
        {
          name: 'generalFeedback',
          type: 'richText',
          admin: {
            description: 'General feedback shown to all students',
          },
        },
      ],
    },
    {
      name: 'analytics',
      type: 'group',
      admin: {
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
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        // Auto-calculate total points if not set
        if (!data.totalPoints && data.questions) {
          const questions = await Promise.all(
            data.questions.map(async (q: any) => {
              if (typeof q.question === 'string') {
                const question = await req.payload.findByID({
                  collection: 'questions',
                  id: q.question,
                })
                return question
              }
              return q.question
            }),
          )
          data.totalPoints = questions.reduce((sum, q) => sum + (q?.points || 1), 0)
        }
        return data
      },
    ],
  },
}
