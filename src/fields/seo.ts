import type { Field } from 'payload'

/**
 * Reusable SEO override fields. Spread these into any collection that renders
 * to a public URL so marketers can override the auto-generated metadata
 * without a code change.
 *
 * Kept as flat fields (not a `group`) so existing flat fields like
 * `seoTitle`/`seoDescription` on BlogPosts stay compatible and no migration
 * is needed. All fields are optional; pages fall back to auto-generated
 * values when left blank.
 */
export const seoFields: Field[] = [
  {
    name: 'seoTitle',
    type: 'text',
    maxLength: 60,
    admin: {
      description: 'SEO title (default: auto-generated from the document title). Ideal length: 50–60 characters.',
      position: 'sidebar',
    },
  },
  {
    name: 'seoDescription',
    type: 'textarea',
    maxLength: 160,
    admin: {
      description: 'SEO meta description (default: auto-generated). Ideal length: 120–160 characters.',
      position: 'sidebar',
    },
  },
  {
    name: 'seoImage',
    type: 'upload',
    relationTo: 'media',
    admin: {
      description: 'Social-share / Open Graph image (default: the document featured image). Recommended 1200×630.',
      position: 'sidebar',
    },
  },
  {
    name: 'noindex',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      description: 'Block search engines from indexing this page.',
      position: 'sidebar',
    },
  },
]
