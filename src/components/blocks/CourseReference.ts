import type { Block } from 'payload'

export const CourseReference: Block = {
  slug: 'course-reference',
  interfaceName: 'CourseReferenceBlock',
  labels: {
    singular: 'Course Reference',
    plural: 'Course References',
  },
  fields: [
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'vinprovningar',
      required: true,
      admin: {
        description: 'Select a course to reference in this content',
      },
    },
    {
      name: 'displayStyle',
      type: 'select',
      label: 'Display Style',
      options: [
        { label: 'Featured Card', value: 'card' },
        { label: 'Compact Banner', value: 'banner' },
        { label: 'Simple Link', value: 'link' },
      ],
      defaultValue: 'card',
      admin: {
        description: 'How this course reference should be displayed',
      },
    },
    {
      name: 'customText',
      type: 'text',
      label: 'Custom Link Text',
      admin: {
        description: 'Optional custom text to display instead of course title',
        condition: (data, siblingData) => siblingData.displayStyle === 'link',
      },
    },
    {
      name: 'showDetails',
      type: 'group',
      label: 'Show Details',
      admin: {
        description: 'Configure which course details to display',
        condition: (data, siblingData) => siblingData.displayStyle === 'card',
      },
      fields: [
        {
          name: 'showImage',
          type: 'checkbox',
          label: 'Show Course Image',
          defaultValue: true,
        },
        {
          name: 'showPrice',
          type: 'checkbox',
          label: 'Show Price',
          defaultValue: true,
        },
        {
          name: 'showLevel',
          type: 'checkbox',
          label: 'Show Difficulty Level',
          defaultValue: true,
        },
        {
          name: 'showDuration',
          type: 'checkbox',
          label: 'Show Duration',
          defaultValue: false,
        },
        {
          name: 'showInstructor',
          type: 'checkbox',
          label: 'Show Instructor',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'callToAction',
      type: 'text',
      label: 'Call to Action',
      defaultValue: 'Visa kurs',
      admin: {
        description: 'Text for the action button/link',
        condition: (data, siblingData) => siblingData.displayStyle !== 'link',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Caption',
      admin: {
        description: 'Optional caption to display below the course reference',
        condition: (data, siblingData) => siblingData.displayStyle === 'card',
      },
    },
    {
      name: 'openInNewTab',
      type: 'checkbox',
      label: 'Open in New Tab',
      defaultValue: false,
      admin: {
        description: 'Open course page in a new tab when clicked',
      },
    },
  ],
}
