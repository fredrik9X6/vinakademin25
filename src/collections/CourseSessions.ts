import type { CollectionConfig } from 'payload'

export const CourseSessions: CollectionConfig = {
  slug: 'course-sessions',
  admin: {
    group: 'Sessions',
    useAsTitle: 'joinCode',
    defaultColumns: ['joinCode', 'sessionName', 'status', 'participantCount', 'createdAt'],
    description: 'Live group learning sessions for courses',
  },
  access: {
    read: () => true, // Public read for participants to join
    create: ({ req }) => Boolean(req.user), // Only logged-in users can create
    update: ({ req }) => Boolean(req.user), // Only logged-in users can update
    delete: ({ req }) => req.user?.role === 'admin', // Only admins can delete
  },
  fields: [
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'vinprovningar',
      required: true,
      admin: {
        description: 'The course this session is for',
      },
    },
    {
      name: 'currentLesson',
      type: 'relationship',
      relationTo: 'content-items',
      admin: {
        description: 'Currently active content item in the session',
      },
    },
    {
      name: 'currentQuiz',
      type: 'relationship',
      relationTo: 'content-items',
      admin: {
        description: 'Currently active quiz in the session (deprecated - use currentLesson)',
      },
    },
    {
      name: 'host',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'User who created and hosts this session',
      },
    },
    {
      name: 'joinCode',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: '6-character code for participants to join (e.g., WINE42)',
      },
    },
    {
      name: 'sessionName',
      type: 'text',
      admin: {
        description: 'Optional friendly name for the session',
        placeholder: "Fredrik's Wine Night",
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Paused', value: 'paused' },
        { label: 'Completed', value: 'completed' },
      ],
      admin: {
        description: 'Current status of the session',
      },
    },
    {
      name: 'currentActivity',
      type: 'select',
      required: true,
      defaultValue: 'waiting',
      options: [
        { label: 'Waiting', value: 'waiting' },
        { label: 'Video', value: 'video' },
        { label: 'Quiz', value: 'quiz' },
        { label: 'Wine Review', value: 'wine_review' },
        { label: 'Results', value: 'results' },
      ],
      admin: {
        description: 'What participants are currently doing',
      },
    },
    {
      name: 'participantCount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Number of participants currently in the session',
      },
    },
    {
      name: 'maxParticipants',
      type: 'number',
      defaultValue: 50,
      min: 1,
      max: 200,
      admin: {
        description: 'Maximum number of participants allowed',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      required: true,
      admin: {
        description: 'Session automatically expires after this time (24 hours default)',
      },
    },
  ],
  timestamps: true,
}
