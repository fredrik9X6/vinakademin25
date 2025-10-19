import type { CollectionConfig } from 'payload'

export const Questions: CollectionConfig = {
  slug: 'questions',
  labels: {
    singular: 'Question',
    plural: 'Questions',
  },
  admin: {
    group: 'Course Content',
    defaultColumns: ['title', 'type', 'points', 'difficulty'],
    useAsTitle: 'title',
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => !!user,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'The question text or prompt',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'multiple-choice',
      options: [
        { label: 'Multiple Choice', value: 'multiple-choice' },
        { label: 'True/False', value: 'true-false' },
        { label: 'Short Answer', value: 'short-answer' },
        { label: 'Essay', value: 'essay' },
        { label: 'Fill in the Blank', value: 'fill-blank' },
        { label: 'Matching', value: 'matching' },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      admin: {
        description: 'Additional question content, context, or media',
      },
    },
    {
      name: 'options',
      type: 'array',
      admin: {
        condition: (data) => ['multiple-choice', 'matching'].includes(data.type),
        description: 'Answer options for multiple choice and matching questions',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
        {
          name: 'isCorrect',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Mark as correct answer',
          },
        },
        {
          name: 'explanation',
          type: 'textarea',
          admin: {
            description: 'Optional explanation for this answer choice',
          },
        },
      ],
    },
    {
      name: 'correctAnswer',
      type: 'text',
      admin: {
        condition: (data) => ['true-false', 'short-answer', 'fill-blank'].includes(data.type),
        description: 'The correct answer for non-multiple choice questions',
      },
    },
    {
      name: 'acceptableAnswers',
      type: 'array',
      admin: {
        condition: (data) => ['short-answer', 'fill-blank'].includes(data.type),
        description: 'Alternative acceptable answers',
      },
      fields: [
        {
          name: 'answer',
          type: 'text',
          required: true,
        },
        {
          name: 'caseSensitive',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'explanation',
      type: 'richText',
      admin: {
        description: 'Explanation provided after answering (for all question types)',
      },
    },
    {
      name: 'points',
      type: 'number',
      required: true,
      defaultValue: 1,
      admin: {
        description: 'Points awarded for correct answer',
      },
    },
    {
      name: 'difficulty',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Easy', value: 'easy' },
        { label: 'Medium', value: 'medium' },
        { label: 'Hard', value: 'hard' },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      admin: {
        description: 'Tags for categorizing questions',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'timeLimit',
      type: 'number',
      admin: {
        description: 'Time limit in seconds (optional)',
      },
    },
    {
      name: 'hints',
      type: 'array',
      admin: {
        description: 'Progressive hints for the question',
      },
      fields: [
        {
          name: 'hint',
          type: 'text',
          required: true,
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          defaultValue: 1,
        },
      ],
    },
    {
      name: 'media',
      type: 'relationship',
      relationTo: 'media',
      admin: {
        description: 'Optional image, video, or audio for the question',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Under Review', value: 'review' },
      ],
    },
  ],
  timestamps: true,
}
