import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'

export const UserProgress: CollectionConfig = {
  slug: 'user-progress',
  admin: {
    useAsTitle: 'courseTitle',
    defaultColumns: ['user', 'courseTitle', 'progressPercentage', 'status', 'lastAccessedAt'],
    description: 'Track user progress through courses',
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return { user: { equals: req.user?.id } }
    },
    create: anyLoggedIn,
    update: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return { user: { equals: req.user?.id } }
    },
    delete: adminOnly,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        description: 'Student taking the course',
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      hasMany: false,
      admin: {
        description: 'Course being tracked',
      },
    },
    {
      name: 'courseTitle',
      type: 'text',
      label: 'Course Title',
      admin: {
        description: 'Course title for easy reference',
        readOnly: true,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Not Started', value: 'not-started' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Completed', value: 'completed' },
        { label: 'Paused', value: 'paused' },
        { label: 'Dropped', value: 'dropped' },
      ],
      defaultValue: 'not-started',
      admin: {
        description: 'Current status of the course',
        position: 'sidebar',
      },
    },
    {
      name: 'progressPercentage',
      type: 'number',
      label: 'Progress (%)',
      min: 0,
      max: 100,
      defaultValue: 0,
      admin: {
        description: 'Percentage of course completed',
        position: 'sidebar',
      },
    },
    {
      name: 'enrolledAt',
      type: 'date',
      label: 'Enrolled At',
      admin: {
        description: 'When the student enrolled in the course',
        position: 'sidebar',
      },
    },
    {
      name: 'startedAt',
      type: 'date',
      label: 'Started At',
      admin: {
        description: 'When the student started the course',
        position: 'sidebar',
      },
    },
    {
      name: 'completedAt',
      type: 'date',
      label: 'Completed At',
      admin: {
        description: 'When the student completed the course',
        position: 'sidebar',
      },
    },
    {
      name: 'lastAccessedAt',
      type: 'date',
      label: 'Last Accessed',
      admin: {
        description: 'When the student last accessed the course',
        position: 'sidebar',
      },
    },
    {
      name: 'timeSpent',
      type: 'number',
      label: 'Time Spent (minutes)',
      min: 0,
      defaultValue: 0,
      admin: {
        description: 'Total time spent on the course in minutes',
        position: 'sidebar',
      },
    },
    {
      name: 'currentModule',
      type: 'relationship',
      relationTo: 'modules',
      hasMany: false,
      admin: {
        description: 'Current module being studied',
      },
    },
    {
      name: 'currentLesson',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: false,
      admin: {
        description: 'Current lesson being studied',
      },
    },
    {
      name: 'completedModules',
      type: 'relationship',
      relationTo: 'modules',
      hasMany: true,
      admin: {
        description: 'Modules completed by the student',
      },
    },
    {
      name: 'completedLessons',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: true,
      admin: {
        description: 'Lessons completed by the student',
      },
    },
    {
      name: 'bookmarkedLessons',
      type: 'relationship',
      relationTo: 'lessons',
      hasMany: true,
      admin: {
        description: 'Lessons bookmarked by the student',
      },
    },
    {
      name: 'scores',
      type: 'array',
      label: 'Quiz Scores',
      admin: {
        description: 'Quiz scores for the course',
      },
      fields: [
        {
          name: 'lesson',
          type: 'relationship',
          relationTo: 'lessons',
          required: true,
          admin: {
            description: 'Lesson with quiz',
          },
        },
        {
          name: 'score',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          admin: {
            description: 'Score achieved (percentage)',
          },
        },
        {
          name: 'attempts',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
          admin: {
            description: 'Number of attempts taken',
          },
        },
        {
          name: 'completedAt',
          type: 'date',
          required: true,
          admin: {
            description: 'When the quiz was completed',
          },
        },
      ],
    },
    {
      name: 'quizScores',
      type: 'array',
      label: 'Quiz Results',
      admin: {
        description: 'Results for quizzes (per user, per course)',
      },
      fields: [
        {
          name: 'quiz',
          type: 'relationship',
          relationTo: 'quizzes',
          required: true,
        },
        {
          name: 'score',
          type: 'number',
          required: true,
          min: 0,
          max: 100,
          admin: { description: 'Score achieved (percentage)' },
        },
        {
          name: 'attempts',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 1,
        },
        {
          name: 'passed',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'completedAt',
          type: 'date',
          required: true,
        },
      ],
    },
    {
      name: 'lessonStates',
      type: 'array',
      label: 'Lesson Progress States',
      admin: {
        description: 'Per-lesson watch progress & resume position',
      },
      fields: [
        {
          name: 'lesson',
          type: 'relationship',
          relationTo: 'lessons',
          required: true,
        },
        {
          name: 'progress',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
        },
        {
          name: 'positionSeconds',
          type: 'number',
          min: 0,
          admin: { description: 'Last watched position (seconds)' },
        },
        {
          name: 'durationSeconds',
          type: 'number',
          min: 0,
        },
        {
          name: 'lastWatchedAt',
          type: 'date',
        },
      ],
    },
    {
      name: 'notes',
      type: 'array',
      label: 'Student Notes',
      admin: {
        description: 'Notes taken by the student',
      },
      fields: [
        {
          name: 'lesson',
          type: 'relationship',
          relationTo: 'lessons',
          required: true,
          admin: {
            description: 'Lesson the note is related to',
          },
        },
        {
          name: 'note',
          type: 'richText',
          required: true,
          admin: {
            description: 'Student note content',
          },
        },
        {
          name: 'timestamp',
          type: 'number',
          label: 'Timestamp (seconds)',
          admin: {
            description: 'Video timestamp if applicable',
          },
        },
      ],
    },
    {
      name: 'certificateIssued',
      type: 'checkbox',
      label: 'Certificate Issued',
      defaultValue: false,
      admin: {
        description: 'Has a certificate been issued for this course?',
        position: 'sidebar',
      },
    },
    {
      name: 'certificateIssuedAt',
      type: 'date',
      label: 'Certificate Issued At',
      admin: {
        description: 'When the certificate was issued',
        position: 'sidebar',
        condition: (data) => data?.certificateIssued === true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ req, operation, data }) => {
        // Set course title for easy reference
        if (data.course && req.payload) {
          try {
            const course = await req.payload.findByID({
              collection: 'courses',
              id: data.course,
            })
            if (course) {
              data.courseTitle = course.title
            }
          } catch (error) {
            // Handle error silently
          }
        }

        // Update timestamps based on status changes
        if (operation === 'update' || operation === 'create') {
          const now = new Date()

          if (data.status === 'in-progress' && !data.startedAt) {
            data.startedAt = now
          }

          if (data.status === 'completed' && !data.completedAt) {
            data.completedAt = now
            data.progressPercentage = 100
          }

          data.lastAccessedAt = now
        }

        return data
      },
    ],
  },
  timestamps: true,
}
