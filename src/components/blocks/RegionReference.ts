import type { Block } from 'payload'

export const RegionReference: Block = {
  slug: 'region-reference',
  interfaceName: 'RegionReferenceBlock',
  labels: {
    singular: 'Region Reference',
    plural: 'Region References',
  },
  fields: [
    {
      name: 'region',
      type: 'relationship',
      relationTo: 'regions',
      required: true,
      admin: {
        description: 'Select a wine region to reference in this content',
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
        description: 'How this region reference should be displayed',
      },
    },
    {
      name: 'customText',
      type: 'text',
      label: 'Custom Text',
      admin: {
        description: 'Optional custom text to display instead of region name',
        condition: (data, siblingData) => siblingData.displayStyle === 'link',
      },
    },
  ],
}
