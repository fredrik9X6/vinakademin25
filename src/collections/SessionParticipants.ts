import type { CollectionConfig } from 'payload'

export const SessionParticipants: CollectionConfig = {
  slug: 'session-participants',
  admin: {
    group: 'Sessions',
    useAsTitle: 'nickname',
    defaultColumns: ['nickname', 'session', 'joinedAt', 'isActive'],
    description: 'Participants in live course sessions',
  },
  access: {
    read: () => true, // Public read for session functionality
    create: () => true, // Anyone can join as a participant
    update: () => true, // Participants can update their own data
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'session',
      type: 'relationship',
      relationTo: 'course-sessions',
      required: true,
      admin: {
        description: 'The session this participant belongs to',
      },
    },
    {
      name: 'nickname',
      type: 'text',
      required: true,
      maxLength: 50,
      admin: {
        description: 'Display name chosen by the participant',
      },
    },
    {
      name: 'participantToken',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique token for this participant in the session',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Associated user account (if logged in). Null for guest participants.',
      },
    },
    {
      name: 'email',
      type: 'email',
      admin: {
        description:
          'Optional email captured at guest join. Used for the post-tasting account-claim prompt and the personal summary email.',
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether the participant is currently active in the session',
      },
    },
    {
      name: 'lastActivityAt',
      type: 'date',
      admin: {
        description: 'Last time the participant was active',
      },
    },
    {
      name: 'claimEmailProcessedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description:
          'Set by the cron on every per-participant decision (sent, skipped, or failed). Idempotency guard — prevents the cron from re-processing the same participant.',
      },
    },
    {
      name: 'claimEmailStatus',
      type: 'select',
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Skipped — existing user', value: 'skipped_existing_user' },
        { label: 'Skipped — no email', value: 'skipped_no_email' },
        { label: 'Failed', value: 'failed' },
      ],
      admin: {
        readOnly: true,
        description: 'Outcome of the claim-email decision for operator debugging.',
      },
    },
    {
      name: 'currentLessonId',
      type: 'relationship',
      relationTo: 'content-items',
      hasMany: false,
      admin: {
        readOnly: true,
        description:
          'The lesson this participant is currently viewing. Updated by /api/sessions/[id]/participant-state on every page-view and 30s heartbeat. Read by the SSE roster broadcaster.',
      },
    },
  ],
  timestamps: true,
}
