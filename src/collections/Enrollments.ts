import type { CollectionConfig } from 'payload'

export const Enrollments: CollectionConfig = {
  slug: 'enrollments',
  labels: {
    singular: 'Enrollment',
    plural: 'Enrollments',
  },
  admin: {
    group: 'Users & Progress',
    defaultColumns: ['user', 'course', 'status', 'enrolledAt', 'expiresAt'],
    useAsTitle: 'id',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false

      // Admin can read all enrollments
      if (user.role === 'admin') return true

      // Users can only read their own enrollments
      return {
        user: {
          equals: user.id,
        },
      }
    },
    create: ({ req: { user } }) => {
      if (!user) return false

      // Admin can create any enrollment
      if (user.role === 'admin') return true

      // Users can only create their own enrollments
      return {
        user: {
          equals: user.id,
        },
      }
    },
    update: ({ req: { user } }) => {
      if (!user) return false

      // Admin can update any enrollment
      if (user.role === 'admin') return true

      // Users can only update their own enrollments (limited fields)
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
        description: 'Student enrolled in the course',
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'vinprovningar',
      required: true,
      admin: {
        description: 'Course the student is enrolled in',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Expired', value: 'expired' },
        { label: 'Pending', value: 'pending' },
      ],
    },
    {
      name: 'enrollmentType',
      type: 'select',
      required: true,
      defaultValue: 'paid',
      options: [
        { label: 'Paid', value: 'paid' },
        { label: 'Free', value: 'free' },
        { label: 'Trial', value: 'trial' },
        { label: 'Scholarship', value: 'scholarship' },
        { label: 'Staff', value: 'staff' },
        { label: 'Beta', value: 'beta' },
      ],
    },
    {
      name: 'enrolledAt',
      type: 'date',
      required: true,
      admin: {
        description: 'When the student enrolled',
      },
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: {
        description: 'When the enrollment expires (if applicable)',
      },
    },
    {
      name: 'accessLevel',
      type: 'select',
      defaultValue: 'full',
      options: [
        { label: 'Full Access', value: 'full' },
        { label: 'Preview Only', value: 'preview' },
        { label: 'Limited', value: 'limited' },
        { label: 'Audit', value: 'audit' },
      ],
    },
    {
      name: 'permissions',
      type: 'group',
      fields: [
        {
          name: 'canViewContent',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Can view course content',
          },
        },
        {
          name: 'canTakeQuizzes',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Can take quizzes and assessments',
          },
        },
        {
          name: 'canDownloadFiles',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Can download course files',
          },
        },
        {
          name: 'canPostComments',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Can post comments and participate in discussions',
          },
        },
        {
          name: 'canViewGrades',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Can view their grades and progress',
          },
        },
        {
          name: 'canReceiveCertificate',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Can receive course completion certificate',
          },
        },
      ],
    },
    {
      name: 'payment',
      type: 'group',
      admin: {
        description: 'Payment information',
      },
      fields: [
        {
          name: 'paymentStatus',
          type: 'select',
          defaultValue: 'pending',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Paid', value: 'paid' },
            { label: 'Failed', value: 'failed' },
            { label: 'Refunded', value: 'refunded' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Free', value: 'free' },
          ],
        },
        {
          name: 'amount',
          type: 'number',
          admin: {
            description: 'Amount paid for the course',
          },
        },
        {
          name: 'currency',
          type: 'text',
          defaultValue: 'SEK',
          admin: {
            description: 'Currency code (e.g., SEK, USD, EUR)',
          },
        },
        {
          name: 'transactionId',
          type: 'text',
          admin: {
            description: 'Payment transaction ID',
          },
        },
        {
          name: 'paidAt',
          type: 'date',
          admin: {
            description: 'When payment was completed',
          },
        },
      ],
    },
    {
      name: 'progress',
      type: 'group',
      admin: {
        description: 'Course progress tracking',
      },
      fields: [
        {
          name: 'completionPercentage',
          type: 'number',
          min: 0,
          max: 100,
          defaultValue: 0,
          admin: {
            description: 'Completion percentage (0-100)',
          },
        },
        {
          name: 'lastAccessedAt',
          type: 'date',
          admin: {
            description: 'Last time the student accessed the course',
          },
        },
        {
          name: 'timeSpent',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Total time spent in minutes',
          },
        },
        {
          name: 'currentModule',
          type: 'relationship',
          relationTo: 'modules',
          admin: {
            description: 'Current module being studied',
          },
        },
        {
          name: 'currentLesson',
          type: 'relationship',
          relationTo: 'content-items',
          admin: {
            description: 'Current content item being studied',
          },
        },
        {
          name: 'completedAt',
          type: 'date',
          admin: {
            description: 'When the course was completed',
          },
        },
      ],
    },
    {
      name: 'restrictions',
      type: 'group',
      admin: {
        description: 'Access restrictions and limitations',
      },
      fields: [
        {
          name: 'maxLoginAttempts',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Maximum login attempts (0 = unlimited)',
          },
        },
        {
          name: 'allowedIpAddresses',
          type: 'array',
          admin: {
            description: 'Allowed IP addresses (leave empty for no restriction)',
          },
          fields: [
            {
              name: 'ipAddress',
              type: 'text',
              required: true,
            },
          ],
        },
        {
          name: 'allowedDevices',
          type: 'number',
          defaultValue: 0,
          admin: {
            description: 'Maximum number of devices (0 = unlimited)',
          },
        },
        {
          name: 'requiresProctoring',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Requires proctoring for assessments',
          },
        },
        {
          name: 'offlineAccess',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Allows offline access to content',
          },
        },
      ],
    },
    {
      name: 'reviewTracking',
      type: 'group',
      admin: {
        description: 'Review request tracking',
      },
      fields: [
        {
          name: 'reviewThresholdReachedAt',
          type: 'date',
          admin: {
            description: 'When the user reached the 70% completion threshold',
            readOnly: true,
          },
        },
        {
          name: 'reviewEmailSentAt',
          type: 'date',
          admin: {
            description: 'When the review request email was sent',
            readOnly: true,
          },
        },
        {
          name: 'reviewEmailToken',
          type: 'text',
          admin: {
            description: 'Token for the review request email link',
            readOnly: true,
          },
        },
      ],
    },
    {
      name: 'notes',
      type: 'group',
      admin: {
        description: 'Administrative notes and communication',
      },
      fields: [
        {
          name: 'adminNotes',
          type: 'richText',
          admin: {
            description: 'Internal notes about this enrollment',
          },
        },
        {
          name: 'studentNotes',
          type: 'richText',
          admin: {
            description: 'Notes from the student',
          },
        },
        {
          name: 'specialInstructions',
          type: 'richText',
          admin: {
            description: 'Special instructions for this enrollment',
          },
        },
      ],
    },
    {
      name: 'metadata',
      type: 'group',
      admin: {
        description: 'Additional metadata',
      },
      fields: [
        {
          name: 'referralSource',
          type: 'text',
          admin: {
            description: 'How the student found the course',
          },
        },
        {
          name: 'couponCode',
          type: 'text',
          admin: {
            description: 'Coupon code used for enrollment',
          },
        },
        {
          name: 'enrollmentReason',
          type: 'select',
          options: [
            { label: 'Professional Development', value: 'professional' },
            { label: 'Personal Interest', value: 'personal' },
            { label: 'Academic Requirement', value: 'academic' },
            { label: 'Company Training', value: 'company' },
            { label: 'Career Change', value: 'career-change' },
            { label: 'Other', value: 'other' },
          ],
        },
        {
          name: 'expectedCompletionDate',
          type: 'date',
          admin: {
            description: 'When the student expects to complete the course',
          },
        },
      ],
    },
  ],
  timestamps: true,
  indexes: [
    {
      fields: ['user', 'course'],
      unique: true,
    },
    {
      fields: ['status'],
    },
    {
      fields: ['enrolledAt'],
    },
    {
      fields: ['expiresAt'],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Set enrolled date on creation
        if (operation === 'create' && !data.enrolledAt) {
          data.enrolledAt = new Date()
        }

        // Auto-update completion status based on progress
        if (data.progress?.completionPercentage === 100 && data.status === 'active') {
          data.status = 'completed'
          data.progress.completedAt = new Date()
        }

        // Auto-expire if past expiration date
        if (data.expiresAt && new Date(data.expiresAt) < new Date() && data.status === 'active') {
          data.status = 'expired'
        }

        // Mark review threshold reached when progress hits 70%
        const completionPct = data.progress?.completionPercentage || 0
        if (
          completionPct >= 70 &&
          !data.reviewTracking?.reviewThresholdReachedAt
        ) {
          if (!data.reviewTracking) {
            data.reviewTracking = {}
          }
          data.reviewTracking.reviewThresholdReachedAt = new Date().toISOString()
        }

        return data
      },
    ],
    afterChange: [
      async ({ doc, req, operation }) => {
        // Update user progress when enrollment changes
        if (operation === 'create' || operation === 'update') {
          await req.payload.create({
            collection: 'user-progress',
            data: {
              user: doc.user,
              course: doc.course,
              enrolledAt: doc.enrolledAt,
              status: doc.status === 'active' ? 'in-progress' : 'not-started',
              progressPercentage: doc.progress?.completionPercentage || 0,
              timeSpent: doc.progress?.timeSpent || 0,
              currentModule: doc.progress?.currentModule,
              currentLesson: doc.progress?.currentLesson,
              completedAt: doc.progress?.completedAt,
            },
          })
        }

        if (operation === 'create') {
          const { recordEvent } = await import('../lib/events')
          const userId = typeof doc.user === 'object' ? (doc.user as any)?.id : doc.user
          const courseRef = typeof doc.course === 'object' ? (doc.course as any) : null
          const courseId = courseRef?.id ?? doc.course
          const courseTitle = courseRef?.title

          // Resolve email — relationship may be id-only at this point.
          let email: string | null = null
          if (typeof doc.user === 'object') {
            email = (doc.user as any)?.email || null
          }
          if (!email && userId) {
            try {
              const u = await req.payload.findByID({
                collection: 'users',
                id: userId,
                depth: 0,
              })
              email = (u as any)?.email || null
            } catch {
              // ignore — recordEvent will skip without email
            }
          }

          if (email) {
            void recordEvent({
              payload: req.payload,
              type: 'enrollment_started',
              contactEmail: email,
              label: courseTitle ? `Started: ${courseTitle}` : 'Enrollment started',
              userId: userId ?? null,
              source: 'system',
              metadata: { enrollmentId: doc.id, courseId, courseTitle },
            })
          }
        }
      },
    ],
  },
}
