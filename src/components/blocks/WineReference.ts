import type { Block } from 'payload'

export const WineReference: Block = {
  slug: 'wine-reference',
  interfaceName: 'WineReferenceBlock',
  labels: {
    singular: 'Wine Reference',
    plural: 'Wine References',
  },
  fields: [
    {
      name: 'wine',
      type: 'relationship',
      relationTo: 'wines',
      required: true,
      admin: {
        description: 'Select a wine to reference in this content',
      },
    },
    {
      name: 'displayStyle',
      type: 'select',
      label: 'Display Style',
      options: [
        { label: 'Inline Reference', value: 'inline' },
        { label: 'Featured Card', value: 'card' },
        { label: 'Simple Link', value: 'link' },
      ],
      defaultValue: 'inline',
      admin: {
        description: 'How this wine reference should be displayed',
      },
    },
    {
      name: 'customText',
      type: 'text',
      label: 'Custom Text',
      admin: {
        description: 'Optional custom text to display instead of wine name',
        condition: (data, siblingData) => siblingData.displayStyle === 'link',
      },
    },
    {
      name: 'showDetails',
      type: 'group',
      label: 'Show Details',
      admin: {
        description: 'Configure which wine details to display',
        condition: (data, siblingData) => siblingData.displayStyle === 'card',
      },
      fields: [
        {
          name: 'showImage',
          type: 'checkbox',
          label: 'Show Wine Image',
          defaultValue: true,
        },
        {
          name: 'showRegion',
          type: 'checkbox',
          label: 'Show Region',
          defaultValue: true,
        },
        {
          name: 'showVintage',
          type: 'checkbox',
          label: 'Show Vintage',
          defaultValue: false,
        },
        {
          name: 'showGrapes',
          type: 'checkbox',
          label: 'Show Grape Varieties',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Caption',
      admin: {
        description: 'Optional caption to display below the wine reference',
        condition: (data, siblingData) => siblingData.displayStyle === 'card',
      },
    },
    {
      name: 'openInNewTab',
      type: 'checkbox',
      label: 'Open in New Tab',
      defaultValue: false,
      admin: {
        description: 'Open wine page in a new tab when clicked',
      },
    },
  ],
}
