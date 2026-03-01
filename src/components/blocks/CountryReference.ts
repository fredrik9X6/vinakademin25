import type { Block } from 'payload'

export const CountryReference: Block = {
  slug: 'country-reference',
  interfaceName: 'CountryReferenceBlock',
  labels: {
    singular: 'Country Reference',
    plural: 'Country References',
  },
  fields: [
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      required: true,
      admin: {
        description: 'Select a country to reference in this content',
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
        description: 'How this country reference should be displayed',
      },
    },
    {
      name: 'customText',
      type: 'text',
      label: 'Custom Text',
      admin: {
        description: 'Optional custom text to display instead of country name',
        condition: (data, siblingData) => siblingData.displayStyle === 'link',
      },
    },
  ],
}
