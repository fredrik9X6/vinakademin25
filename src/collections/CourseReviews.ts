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
      required: true,
      label: 'Författare',
      index: true,
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
      ({ req, data }: any) => {
        if (!data) return data
        if (!data.author && req?.user) {
          data.author = req.user.id
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
  },
  timestamps: true,
}
