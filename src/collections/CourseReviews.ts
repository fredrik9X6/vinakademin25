import { CollectionConfig } from 'payload'
import crypto from 'crypto'

export const CourseReviews: CollectionConfig = {
  slug: 'course-reviews',
  labels: {
    singular: 'Course Review',
    plural: 'Course Reviews',
  },
  admin: {
    group: 'Users & Progress',
    defaultColumns: ['course', 'author', 'rating', 'status', 'createdAt'],
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    create: ({ req }: any) => Boolean(req.user),
    update: ({ req, doc }: any) => {
      if (req.user?.role === 'admin') return true
      if (!doc || !req.user) return false
      return req.user?.id === doc.author
    },
    delete: ({ req }: any) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Review Title',
      admin: {
        readOnly: true,
        description: 'Auto-generated from course name and rating',
      },
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'vinprovningar',
      required: true,
      label: 'Vinprovning',
      index: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      // Required at application-write time; nullable in the DB so SET NULL on
      // user delete preserves the review with its `authorDisplayName` snapshot.
      required: false,
      label: 'Författare',
      index: true,
    },
    {
      name: 'authorDisplayName',
      type: 'text',
      label: 'Författarens namn (snapshot)',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Captured at write-time from the linked user. Survives user deletion so the review keeps its attribution.',
      },
    },
    {
      name: 'rating',
      type: 'number',
      label: 'Betyg (1-5)',
      required: true,
      min: 1,
      max: 5,
    },
    {
      name: 'content',
      type: 'textarea',
      label: 'Recension',
      required: true,
      maxLength: 2000,
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Pending', value: 'pending' },
      ],
      defaultValue: 'published',
      required: true,
    },
    {
      name: 'isVerifiedPurchase',
      type: 'checkbox',
      label: 'Verifierat köp',
      defaultValue: false,
    },
    {
      name: 'reviewToken',
      type: 'text',
      label: 'Review Token',
      admin: {
        description: 'Token from review request email (used to verify the review link)',
        readOnly: true,
        position: 'sidebar',
      },
      index: true,
    },
  ],
  hooks: {
    beforeChange: [
      async ({ req, data, operation, originalDoc }: any) => {
        if (!data) return data
        if (!data.author && req?.user) {
          data.author = req.user.id
        }

        // Snapshot the author's display name on create so the review keeps its
        // attribution even after the user is deleted. We only set it once —
        // never overwrite an existing value, so the snapshot is point-in-time.
        const existingSnapshot = originalDoc?.authorDisplayName || data.authorDisplayName
        if (operation === 'create' && !existingSnapshot && data.author) {
          try {
            const authorId = typeof data.author === 'object' ? data.author.id : data.author
            const u = await req.payload.findByID({
              collection: 'users',
              id: authorId,
              depth: 0,
            })
            if (u) {
              const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
              if (name) data.authorDisplayName = name
            }
          } catch {
            // Snapshot is best-effort; never block the write.
          }
        }
        return data
      },
    ],
    beforeValidate: [
      async ({ data, req, operation }: any) => {
        if (!data) return data

        // Auto-generate title from course name and rating
        if (data.course && (operation === 'create' || operation === 'update')) {
          try {
            const courseId = typeof data.course === 'object' ? data.course.id : data.course
            if (courseId && req.payload) {
              const course = await req.payload.findByID({
                collection: 'vinprovningar',
                id: courseId,
                depth: 0,
              })
              if (course?.title) {
                const stars = data.rating ? '★'.repeat(data.rating) : ''
                data.title = `${course.title} - ${stars}`
              }
            }
          } catch {
            // Keep existing title
          }
        }

        // Generate review token if not present
        if (operation === 'create' && !data.reviewToken) {
          data.reviewToken = crypto.randomBytes(32).toString('hex')
        }

        return data
      },
    ],
    afterChange: [
      async ({ req, doc, operation }: any) => {
        if (operation !== 'create') return
        void (async () => {
          const { recordEvent } = await import('../lib/events')
          const userId = typeof doc.author === 'object' ? doc.author?.id : doc.author
          let email: string | null =
            typeof doc.author === 'object' ? doc.author?.email || null : null
          if (!email && userId) {
            try {
              const u = await req.payload.findByID({
                collection: 'users',
                id: userId,
                depth: 0,
              })
              email = (u as any)?.email || null
            } catch {
              // ignore
            }
          }
          if (!email) return
          await recordEvent({
            payload: req.payload,
            type: 'review_submitted',
            contactEmail: email,
            label: `Course review (${doc.rating ?? '–'}/5)`,
            userId: userId ?? null,
            source: 'system',
            metadata: {
              kind: 'course',
              reviewId: doc.id,
              courseId: typeof doc.course === 'object' ? doc.course?.id : doc.course,
              rating: doc.rating,
            },
          })
        })()
      },
    ],
  },
  timestamps: true,
}
