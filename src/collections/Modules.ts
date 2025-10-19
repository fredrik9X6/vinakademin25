import type { CollectionConfig } from 'payload'

export const Modules: CollectionConfig = {
  slug: 'modules',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order', 'course'],
    description: 'Course modules that contain lessons',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Module Title',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Module Description',
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      defaultValue: 0,
      min: 0,
      label: 'Display Order',
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      label: 'Course',
    },
    // Drag & drop ordering of module contents (lessons/quizzes)
    {
      name: 'contents',
      type: 'blocks',
      label: 'Innehåll',
      admin: {
        description:
          'Lägg till och ordna lektioner och quiz med drag & drop. Detta styr ordningen i kursens innehåll.',
      },
      blocks: [
        {
          slug: 'lesson-item',
          labels: { singular: 'Lektion', plural: 'Lektioner' },
          fields: [
            {
              name: 'lesson',
              type: 'relationship',
              relationTo: 'lessons',
              required: true,
            },
          ],
        },
        {
          slug: 'quiz-item',
          labels: { singular: 'Quiz', plural: 'Quizzer' },
          fields: [
            {
              name: 'quiz',
              type: 'relationship',
              relationTo: 'quizzes',
              required: true,
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
}
