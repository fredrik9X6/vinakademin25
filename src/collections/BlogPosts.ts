import type { CollectionConfig } from 'payload'
import { anyLoggedIn, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { BlocksFeature, UploadFeature } from '@payloadcms/richtext-lexical'
import { WineReference, NewsletterSignup, CourseReference } from '../components/blocks'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', '_status', 'publishedDate', 'author'],
    description: 'Blog posts for wine education, news, and articles',
    livePreview: {
      url: ({ data }) => {
        const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
        return `${baseUrl}/artiklar/${data.slug}?preview=true&slug=${data.slug}`
      },
    },
  },
  // Enable versions, drafts, and autosave
  versions: {
    maxPerDoc: 50,
    drafts: {
      autosave: {
        interval: 1500,
      },
    },
  },
  access: {
    read: ({ req }) => {
      if (req.user?.role === 'admin') return true
      return {
        _status: { equals: 'published' },
      }
    },
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [withCreatedByUpdatedBy],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly version of the title',
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description: 'Brief summary shown in listings and SEO',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
      editor: lexicalEditor({
        features: ({ rootFeatures }) => [
          ...rootFeatures,
          BlocksFeature({
            blocks: [WineReference, NewsletterSignup, CourseReference],
          }),
          UploadFeature({
            collections: {
              media: {
                fields: [
                  {
                    name: 'imageLayout',
                    type: 'select',
                    defaultValue: 'medium',
                    options: [
                      { label: 'Icon (100px)', value: 'icon' },
                      { label: 'Thumbnail (150px)', value: 'thumbnail' },
                      { label: 'Small (300px)', value: 'small' },
                      { label: 'Medium (600px)', value: 'medium' },
                      { label: 'Large (900px)', value: 'large' },
                      { label: 'Full Width', value: 'full' },
                    ],
                    admin: {
                      description: 'Choose image size for display',
                    },
                  },
                  {
                    name: 'imageAlignment',
                    type: 'select',
                    defaultValue: 'center',
                    options: [
                      { label: 'Left', value: 'left' },
                      { label: 'Center', value: 'center' },
                      { label: 'Right', value: 'right' },
                    ],
                    admin: {
                      description: 'Image alignment within the content',
                    },
                  },
                  {
                    name: 'imageCaption',
                    type: 'text',
                    admin: {
                      description: 'Optional caption to display below the image',
                    },
                  },
                  {
                    name: 'imageBorder',
                    type: 'checkbox',
                    defaultValue: false,
                    admin: {
                      description: 'Add a subtle border around the image',
                    },
                  },
                  {
                    name: 'imageShadow',
                    type: 'checkbox',
                    defaultValue: true,
                    admin: {
                      description: 'Add a drop shadow to the image',
                    },
                  },
                ],
              },
            },
          }),
        ],
      }),
    },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Main image for the blog post',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'blog-categories',
      required: true,
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'blog-tags',
      hasMany: true,
    },
    {
      name: 'publishedDate',
      type: 'date',
      defaultValue: () => new Date(),
      admin: {
        description: 'When this post was/will be published',
      },
    },
    {
      name: 'seoTitle',
      type: 'text',
      maxLength: 60,
      admin: {
        description: 'SEO title (default: post title)',
      },
    },
    {
      name: 'seoDescription',
      type: 'textarea',
      maxLength: 160,
      admin: {
        description: 'SEO meta description (default: excerpt)',
      },
    },
  ],
}
