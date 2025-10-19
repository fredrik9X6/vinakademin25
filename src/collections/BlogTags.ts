import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const BlogTags: CollectionConfig = {
  slug: 'blog-tags',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'type', 'createdAt'],
    description: 'Tags for categorizing blog posts',
  },
  access: {
    read: () => true,
    create: anyLoggedIn,
    update: anyLoggedIn,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [withCreatedByUpdatedBy],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      label: 'Tag Name',
      admin: { description: 'Name of the blog tag' },
    },
    {
      name: 'slug',
      type: 'text',
      label: 'Slug',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'URL-friendly version of the tag name',
      },
      hooks: {
        beforeValidate: [
          ({ data }) => {
            if (data && !data.slug && data.name) {
              return data.name
                .toLowerCase()
                .replace(/[^\w\s]/gi, '')
                .replace(/\s+/g, '-')
            }
            return data?.slug
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Description',
      admin: { description: 'Brief description of this tag' },
    },
    {
      name: 'type',
      type: 'select',
      label: 'Tag Type',
      options: [
        { label: 'General', value: 'general' },
        { label: 'Wine Type', value: 'wine-type' },
        { label: 'Wine Region', value: 'wine-region' },
        { label: 'Grape Variety', value: 'grape-variety' },
        { label: 'Tasting Note', value: 'tasting-note' },
        { label: 'Food Pairing', value: 'food-pairing' },
        { label: 'Wine Technique', value: 'wine-technique' },
        { label: 'Industry Topic', value: 'industry-topic' },
      ],
      defaultValue: 'general',
      admin: {
        position: 'sidebar',
        description: 'Type of tag for better organization',
      },
    },
    {
      name: 'color',
      type: 'select',
      label: 'Color Theme',
      options: [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
        { label: 'Green', value: 'green' },
        { label: 'Purple', value: 'purple' },
        { label: 'Orange', value: 'orange' },
        { label: 'Yellow', value: 'yellow' },
        { label: 'Pink', value: 'pink' },
        { label: 'Gray', value: 'gray' },
      ],
      defaultValue: 'gray',
      admin: {
        position: 'sidebar',
        description: 'Color theme for visual distinction',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who created this tag',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      required: false,
      hasMany: false,
      admin: {
        description: 'User who last updated this tag',
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
  timestamps: true,
}
