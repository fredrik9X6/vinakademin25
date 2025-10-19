import type { CollectionConfig } from 'payload'

export const SessionParticipants: CollectionConfig = {
  slug: 'session-participants',
  admin: {
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
        description: 'Associated user account (if logged in)',
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
  ],
  timestamps: true,
}
