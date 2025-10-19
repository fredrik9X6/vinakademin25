import type { CollectionConfig } from 'payload'

export const QuizAttempts: CollectionConfig = {
  slug: 'quiz-attempts',
  labels: {
    singular: 'Quiz Attempt',
    plural: 'Quiz Attempts',
  },
  admin: {
    group: 'Analytics',
    defaultColumns: ['user', 'quiz', 'score', 'status', 'completedAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false

      // Admin can read all attempts
      if (user.role === 'admin') return true

      // Users can only read their own attempts
      return {
        user: {
          equals: user.id,
        },
      }
    },
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => {
      if (!user) return false

      // Admin can update all attempts
      if (user.role === 'admin') return true

      // Users can only update their own attempts
      return {
        user: {
          equals: user.id,
        },
      }
    },
    delete: ({ req: { user } }) => user?.role === 'admin',
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Student who took the quiz',
      },
    },
    {
      name: 'quiz',
      type: 'relationship',
      relationTo: 'quizzes',
      required: true,
      admin: {
        description: 'Quiz that was attempted',
      },
    },
    {
      name: 'attemptNumber',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description: 'Which attempt this is for the user (1, 2, 3, etc.)',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'in-progress',
      options: [
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Abandoned', value: 'abandoned' },
        { label: 'Expired', value: 'expired' },
      ],
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      admin: {
        description: 'When the attempt was started',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        description: 'When the attempt was completed',
      },
    },
    {
      name: 'timeSpent',
      type: 'number',
      admin: {
        description: 'Total time spent in seconds',
      },
    },
    {
      name: 'answers',
      type: 'array',
      admin: {
        description: 'User answers for each question',
      },
      fields: [
        {
          name: 'question',
          type: 'relationship',
          relationTo: 'questions',
          required: true,
        },
        {
          name: 'answer',
          type: 'json',
          admin: {
            description: "User's answer (format depends on question type)",
          },
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          admin: {
            description: 'Whether the answer is correct',
          },
        },
        {
          name: 'pointsAwarded',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Points awarded for this answer',
          },
        },
        {
          name: 'timeSpent',
          type: 'number',
          admin: {
            description: 'Time spent on this question in seconds',
          },
        },
        {
          name: 'answeredAt',
          type: 'date',
          admin: {
            description: 'When this question was answered',
          },
        },
      ],
    },
    {
      name: 'scoring',
      type: 'group',
      fields: [
        {
          name: 'totalPoints',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Total points scored',
          },
        },
        {
          name: 'maxPoints',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Maximum points possible',
          },
        },
        {
          name: 'score',
          type: 'number',
          min: 0,
          max: 100,
          admin: {
            description: 'Score as percentage',
          },
        },
        {
          name: 'passed',
          type: 'checkbox',
          admin: {
            description: 'Whether the attempt passed the quiz',
          },
        },
        {
          name: 'grade',
          type: 'select',
          options: [
            { label: 'A+', value: 'a-plus' },
            { label: 'A', value: 'a' },
            { label: 'A-', value: 'a-minus' },
            { label: 'B+', value: 'b-plus' },
            { label: 'B', value: 'b' },
            { label: 'B-', value: 'b-minus' },
            { label: 'C+', value: 'c-plus' },
            { label: 'C', value: 'c' },
            { label: 'C-', value: 'c-minus' },
            { label: 'D+', value: 'd-plus' },
            { label: 'D', value: 'd' },
            { label: 'D-', value: 'd-minus' },
            { label: 'F', value: 'f' },
          ],
          admin: {
            description: 'Letter grade (optional)',
          },
        },
      ],
    },
    {
      name: 'feedback',
      type: 'group',
      fields: [
        {
          name: 'autoFeedback',
          type: 'richText',
          admin: {
            description: 'Automatic feedback based on score',
          },
        },
        {
          name: 'instructorFeedback',
          type: 'richText',
          admin: {
            description: 'Manual feedback from instructor',
          },
        },
        {
          name: 'feedbackGivenAt',
          type: 'date',
          admin: {
            description: 'When instructor feedback was provided',
          },
        },
      ],
    },
    {
      name: 'metadata',
      type: 'group',
      admin: {
        description: 'Additional metadata about the attempt',
      },
      fields: [
        {
          name: 'ipAddress',
          type: 'text',
          admin: {
            description: 'IP address of the user',
          },
        },
        {
          name: 'userAgent',
          type: 'text',
          admin: {
            description: 'User agent string',
          },
        },
        {
          name: 'deviceType',
          type: 'select',
          options: [
            { label: 'Desktop', value: 'desktop' },
            { label: 'Mobile', value: 'mobile' },
            { label: 'Tablet', value: 'tablet' },
          ],
        },
        {
          name: 'browserInfo',
          type: 'json',
          admin: {
            description: 'Browser information',
          },
        },
      ],
    },
    {
      name: 'flags',
      type: 'group',
      admin: {
        description: 'Special flags for this attempt',
      },
      fields: [
        {
          name: 'isRetake',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether this is a retake attempt',
          },
        },
        {
          name: 'hasExtendedTime',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether user was granted extended time',
          },
        },
        {
          name: 'proctored',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether this was a proctored attempt',
          },
        },
        {
          name: 'flaggedForReview',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether this attempt is flagged for manual review',
          },
        },
        {
          name: 'reviewNotes',
          type: 'textarea',
          admin: {
            description: 'Notes from manual review',
          },
        },
      ],
    },
  ],
  timestamps: true,
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-calculate score percentage
        if (data.scoring?.totalPoints && data.scoring?.maxPoints) {
          data.scoring.score = Math.round((data.scoring.totalPoints / data.scoring.maxPoints) * 100)
        }

        // Auto-set completion time
        if (data.status === 'completed' && !data.completedAt) {
          data.completedAt = new Date()
        }

        // Calculate time spent if not set
        if (data.startedAt && data.completedAt && !data.timeSpent) {
          const start = new Date(data.startedAt)
          const end = new Date(data.completedAt)
          data.timeSpent = Math.floor((end.getTime() - start.getTime()) / 1000)
        }

        return data
      },
    ],
  },
}
