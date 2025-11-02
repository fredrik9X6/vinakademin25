import type { CollectionConfig } from 'payload'

export const Questions: CollectionConfig = {
  slug: 'questions',
  labels: {
    singular: 'Question',
    plural: 'Questions',
  },
  admin: {
    group: 'Questions & Quizzes',
    defaultColumns: ['title', 'type', 'points'],
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
        condition: (data) => data.type === 'multiple-choice',
        description: 'Answer options for multiple choice questions',
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
      name: 'correctAnswerTrueFalse',
      type: 'select',
      required: true,
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
      admin: {
        condition: (data) => data.type === 'true-false',
        description: 'The correct answer for True/False questions',
      },
    },
    {
      name: 'correctAnswer',
      type: 'text',
      admin: {
        condition: (data) => data.type === 'short-answer',
        description: 'The correct answer for short answer questions',
      },
    },
    {
      name: 'acceptableAnswers',
      type: 'array',
      admin: {
        condition: (data) => data.type === 'short-answer',
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
  ],
  timestamps: true,
}
