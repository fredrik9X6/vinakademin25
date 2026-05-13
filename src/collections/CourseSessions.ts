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
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const hasCourse = data.course != null && data.course !== ''
        const hasPlan = data.tastingPlan != null && data.tastingPlan !== ''
        if (hasCourse && hasPlan) {
          throw new Error(
            'CourseSessions: a session must be driven by EITHER a course or a tastingPlan, not both.',
          )
        }
        if (!hasCourse && !hasPlan) {
          throw new Error(
            'CourseSessions: a session must have either a course or a tastingPlan set.',
          )
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation }) => {
        // Stamp completedAt and reset claimEmailsDispatchedAt on the → completed
        // transition. Re-completing a session re-stamps completedAt and re-arms
        // the cron so newly-added participants can still receive a claim email,
        // while per-participant claimEmailProcessedAt prevents duplicate sends.
        if (operation !== 'update') return data
        const wasCompleted = originalDoc?.status === 'completed'
        const isCompleted = data?.status === 'completed'
        if (!wasCompleted && isCompleted) {
          return {
            ...data,
            completedAt: new Date().toISOString(),
            claimEmailsDispatchedAt: null,
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'vinprovningar',
      required: false,
      admin: {
        description: 'A course (Vinprovningar) OR a tastingPlan must be set — XOR enforced by beforeValidate.',
      },
    },
    {
      name: 'tastingPlan',
      type: 'relationship',
      relationTo: 'tasting-plans',
      hasMany: false,
      admin: {
        description:
          'Set when this session is driven by a member-authored plan. XOR with course.',
      },
    },
    {
      name: 'currentLesson',
      type: 'relationship',
      relationTo: 'content-items',
      admin: {
        description: 'Currently active content item in the session (course mode)',
      },
    },
    {
      name: 'currentWinePourOrder',
      type: 'number',
      min: 1,
      admin: {
        description: 'Active wine pour order in plan-driven sessions (plan mode)',
      },
    },
    {
      name: 'blindTasting',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Runtime flag for plan sessions. Stamped from plan.blindTastingByDefault at create-time; may be overridden.',
      },
    },
    {
      name: 'revealedPourOrders',
      type: 'json',
      defaultValue: [],
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Pour orders the host has revealed (blind mode). JSON array of numbers.',
      },
    },
    {
      name: 'currentWineFocusStartedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Stamped on every plan-mode focus change. Used to compute timer remaining.',
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
      // Required at application-write time; nullable in the DB so SET NULL on
      // user delete preserves the session as a historical record.
      required: false,
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
    {
      name: 'completedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Stamped by the beforeChange hook when status transitions to "completed". Read by the claim-email cron to compute the 30-minute window.',
      },
    },
    {
      name: 'claimEmailsDispatchedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Set by the cron after iterating participants for this session. Cleared on re-completion so the cron can re-process newly-added participants.',
      },
    },
    {
      name: 'wrapUpEmailsDispatchedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description:
          'Stamped when the wrap-up email cron has processed this session. NULL means not yet dispatched.',
      },
    },
  ],
  timestamps: true,
}
