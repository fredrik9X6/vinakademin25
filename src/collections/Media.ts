import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly, anyLoggedIn } from '../lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Media',
    description: 'Media files such as images, videos, and documents',
  },
  access: {
    read: () => true,
    create: ({ req }) => {
      if (!req.user) return true // form building
      return req.user.role === 'admin' || req.user.role === 'instructor'
    },
    update: ({ req }) => {
      if (!req.user) return true // form building
      return req.user.role === 'admin' || req.user.role === 'instructor'
    },
    delete: adminOnly,
  },
  upload: {
    adminThumbnail: 'thumbnail',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        // Portrait bottle thumbnail — used in tasting-plan wine rows,
        // session screens, shopping list, review lists.
        //
        // `fit: 'inside'` preserves the source aspect and scales DOWN to fit
        // within 200x400. Default `cover` would centre-crop the source to
        // 1:2, which on very tall library bottle photos (e.g. 400x1721,
        // 636x2048) chopped off the cap and base and showed only the label.
        // Inside fit keeps the whole bottle visible at the cost of variable
        // output dimensions per image.
        name: 'bottle',
        width: 200,
        height: 400,
        position: 'centre',
        fit: 'inside',
      },
      {
        name: 'profile',
        width: 200,
        height: 200,
        position: 'centre',
      },
      {
        name: 'card',
        width: 640,
        height: 480,
        position: 'centre',
      },
      {
        name: 'feature',
        width: 1280,
        height: 720,
        position: 'centre',
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: false, // Temporarily optional due to existing null values
      label: 'Alt Text',
      admin: {
        description: 'Descriptive text for screen readers and SEO',
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: 'Caption',
      admin: {
        description: 'Optional caption text to display with the media',
      },
    },
  ],
  hooks: {
    beforeRead: [
      ({ doc }) => {
        // Ensure file URLs are properly formatted
        return doc
      },
    ],
  },
}
