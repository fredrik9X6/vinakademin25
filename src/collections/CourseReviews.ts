import { CollectionConfig } from 'payload'

export const CourseReviews: CollectionConfig = {
  slug: 'course-reviews',
  labels: {
    singular: 'Course Review',
    plural: 'Course Reviews',
  },
  admin: {
    defaultColumns: ['title', 'course', 'author', 'rating', 'status', 'createdAt'],
    useAsTitle: 'title',
  },
  access: {
    read: () => true, // Public reviews
    create: ({ req }: any) => Boolean(req.user), // Only authenticated users can create reviews
    update: ({ req, doc }: any) => {
      if (req.user?.role === 'admin') return true
      if (!doc || !req.user) return false
      return req.user?.id === doc.author
    },
    delete: ({ req, doc }: any) => {
      if (req.user?.role === 'admin') return true
      if (!doc || !req.user) return false
      return req.user?.id === doc.author
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'Review Title',
      required: true,
      maxLength: 100,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
      label: 'Course',
      index: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Author',
      index: true,
    },
    {
      name: 'rating',
      type: 'number',
      label: 'Rating (1-5)',
      required: true,
      min: 1,
      max: 5,
      validate: (value: any) => {
        if (value < 1 || value > 5) {
          return 'Rating must be between 1 and 5'
        }
        return true
      },
    },
    {
      name: 'content',
      type: 'richText',
      label: 'Review Content',
      required: true,
    },
    {
      name: 'pros',
      type: 'array',
      label: 'Pros',
      fields: [
        {
          name: 'point',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'cons',
      type: 'array',
      label: 'Cons',
      fields: [
        {
          name: 'point',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      label: 'Status',
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Pending', value: 'pending' },
        { label: 'Rejected', value: 'rejected' },
      ],
      defaultValue: 'pending',
      required: true,
    },
    {
      name: 'isVerifiedPurchase',
      type: 'checkbox',
      label: 'Verified Purchase',
      defaultValue: false,
    },
    {
      name: 'completionStatus',
      type: 'select',
      label: 'Course Completion Status',
      options: [
        { label: 'Not Started', value: 'not_started' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Completed', value: 'completed' },
      ],
      defaultValue: 'not_started',
    },
    {
      name: 'helpfulVotes',
      type: 'number',
      label: 'Helpful Votes',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'totalVotes',
      type: 'number',
      label: 'Total Votes',
      defaultValue: 0,
      min: 0,
    },
    {
      name: 'moderatorNotes',
      type: 'textarea',
      label: 'Moderator Notes',
      admin: {
        condition: ({ req }: any) => req.user?.role === 'admin',
      },
    },
    {
      name: 'metadata',
      type: 'group',
      label: 'Metadata',
      fields: [
        {
          name: 'deviceType',
          type: 'select',
          label: 'Device Type',
          options: [
            { label: 'Desktop', value: 'desktop' },
            { label: 'Mobile', value: 'mobile' },
            { label: 'Tablet', value: 'tablet' },
          ],
        },
        {
          name: 'userAgent',
          type: 'text',
          label: 'User Agent',
        },
        {
          name: 'location',
          type: 'text',
          label: 'Location',
        },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      ({ req, data }: any) => {
        // Ensure data and req exist
        if (!data) {
          return data
        }

        // Auto-set author if not provided
        if (!data.author && req?.user) {
          data.author = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ req, doc, operation }: any) => {
        // Ensure doc exists before accessing properties
        if (!doc) {
          return
        }

        // Update course average rating when review is created/updated
        if (operation === 'create' || operation === 'update') {
          // This would typically trigger a background job to recalculate course ratings
          // For now, we'll just log it
          console.log(`Review ${operation} for course ${doc.course}`)
        }
      },
    ],
  },
  timestamps: true,
}
