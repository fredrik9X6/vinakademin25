import type { Block } from 'payload'

export const WineList: Block = {
  slug: 'wine-list',
  interfaceName: 'WineListBlock',
  labels: {
    singular: 'Wine List',
    plural: 'Wine Lists',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: 'List Title',
      defaultValue: 'Viner du behöver för denna vinprovning',
      admin: {
        description: 'Title displayed above the wine list',
      },
    },
    {
      name: 'wines',
      type: 'relationship',
      relationTo: 'wines',
      hasMany: true,
      required: true,
      admin: {
        description: 'Select wines required for this course/tasting',
      },
    },
    {
      name: 'displayStyle',
      type: 'select',
      label: 'Display Style',
      options: [
        { label: 'Compact List', value: 'compact' },
        { label: 'Card Grid', value: 'grid' },
        { label: 'Detailed List', value: 'detailed' },
      ],
      defaultValue: 'compact',
      admin: {
        description: 'How the wine list should be displayed',
      },
    },
    {
      name: 'showPrices',
      type: 'checkbox',
      label: 'Show Prices',
      defaultValue: true,
      admin: {
        description: 'Display wine prices in the list',
      },
    },
    {
      name: 'showImages',
      type: 'checkbox',
      label: 'Show Images',
      defaultValue: true,
      admin: {
        description: 'Display wine images',
        condition: (data, siblingData) => siblingData.displayStyle !== 'compact',
      },
    },
    {
      name: 'showTotalPrice',
      type: 'checkbox',
      label: 'Show Total Price',
      defaultValue: true,
      admin: {
        description: 'Display total price for all wines',
        condition: (data, siblingData) => siblingData.showPrices,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: {
        description: 'Optional description or instructions for purchasing these wines',
      },
    },
    {
      name: 'shoppingListUrl',
      type: 'text',
      label: 'Shopping List URL',
      admin: {
        description: 'Link to a shopping list or basket where users can buy all the wines (e.g., Systembolaget shopping list)',
      },
    },
  ],
}
