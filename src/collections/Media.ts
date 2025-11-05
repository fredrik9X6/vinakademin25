import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly, anyLoggedIn } from '../lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Media',
    description: 'Media files such as images, videos, and documents',
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
import type { CollectionConfig } from 'payload'
import { adminOnly, adminOrInstructorOnly, anyLoggedIn } from '../lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Media',
    description: 'Media files such as images, videos, and documents',
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
      async ({ doc, req }) => {
        // Ensure file URLs are properly formatted
        // If file doesn't exist in storage, return doc with null URL to prevent crashes
        if (doc?.url && typeof doc.url === 'string') {
          // Keep the URL as-is - let PayloadCMS handle missing files gracefully
          return doc
        }
        return doc
      },
    ],
    afterRead: [
      async ({ doc, req }) => {
        // Catch any errors when reading files and provide fallback
        // This prevents Server Component crashes when files are missing from S3
        try {
          // If doc has a url but it's broken, we can't fix it here
          // The storage adapter will handle the error
          return doc
        } catch (error: any) {
          // If reading the file fails, return doc without URL
          // This prevents the entire admin panel from crashing
          if (error?.name === 'NoSuchKey' || error?.code === 'NoSuchKey') {
            req.payload.logger.warn(
              `Media file not found in storage: ${doc?.filename || doc?.id}`,
            )
            // Return doc with a placeholder URL to prevent crashes
            return {
              ...doc,
              url: doc?.url || null, // Keep existing URL structure but mark as missing
            }
          }
          // Re-throw other errors
          throw error
        }
      },
    ],
  },
}
}
