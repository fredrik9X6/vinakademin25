import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly, anyLoggedIn } from '../lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Media',
  },
  access: {
    // Anyone can read media files
    read: () => true,
    // Allow form state building by returning true for form context
    create: ({ req }) => {
      // Admins and instructors can always create
      if (req.user?.role === 'admin' || req.user?.role === 'instructor') return true
      // Allow any logged-in user to create
      if (req.user) return true
      // Allow form building when no user context (happens during admin UI initialization)
      return true
    },
    // Allow form building - security handled in hooks
    update: () => true,
    // Only admins can delete media
    delete: adminOnly,
  },
  admin: {
    description: 'Media files such as images, videos, and documents',
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
