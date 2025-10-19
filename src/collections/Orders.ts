import type { CollectionConfig } from 'payload'
import { adminOrSelf, adminOnly } from '../lib/access'
import { withCreatedByUpdatedBy } from '../lib/hooks'

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'status', 'amount', 'user', 'createdAt'],
    description: 'Course purchase orders and payment tracking',
    group: 'Commerce',
  },
  access: {
    read: adminOrSelf,
    create: ({ req }) => {
      // Only authenticated users can create orders (through API)
      return Boolean(req.user)
    },
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    beforeChange: [withCreatedByUpdatedBy],
    beforeValidate: [
      // Generate order number if not provided
      ({ data, operation }) => {
        if (operation === 'create' && data && !data.orderNumber) {
          data.orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        }
      },
    ],
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Unique order identifier',
        readOnly: true,
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Customer who placed the order',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Processing', value: 'processing' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
      admin: {
        description: 'Current status of the order',
      },
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'course',
          type: 'relationship',
          relationTo: 'courses',
          required: true,
          admin: {
            description: 'Course being purchased',
          },
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
          admin: {
            description: 'Price paid for this course (in SEK)',
          },
        },
        {
          name: 'quantity',
          type: 'number',
          required: true,
          defaultValue: 1,
          min: 1,
          admin: {
            description: 'Quantity (usually 1 for courses)',
          },
        },
      ],
      admin: {
        description: 'Courses included in this order',
      },
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        description: 'Total order amount (in SEK)',
      },
    },
    {
      name: 'currency',
      type: 'text',
      required: true,
      defaultValue: 'SEK',
      admin: {
        description: 'Order currency',
        readOnly: true,
      },
    },
    {
      name: 'discountAmount',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        description: 'Total discount applied (in SEK)',
      },
    },
    {
      name: 'discountCode',
      type: 'text',
      admin: {
        description: 'Discount code used (if any)',
      },
    },
    // Stripe Integration Fields
    {
      name: 'stripePaymentIntentId',
      type: 'text',
      admin: {
        description: 'Stripe Payment Intent ID',
        readOnly: true,
      },
    },
    {
      name: 'stripeSessionId',
      type: 'text',
      admin: {
        description: 'Stripe Checkout Session ID',
        readOnly: true,
      },
    },
    {
      name: 'stripeCustomerId',
      type: 'text',
      admin: {
        description: 'Stripe Customer ID',
        readOnly: true,
      },
    },
    {
      name: 'stripeChargeId',
      type: 'text',
      admin: {
        description: 'Stripe Charge ID (for completed payments)',
        readOnly: true,
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      options: [
        { label: 'Card', value: 'card' },
        { label: 'Klarna', value: 'klarna' },
      ],
      admin: {
        description: 'Payment method used',
      },
    },
    {
      name: 'paymentMethodDetails',
      type: 'json',
      admin: {
        description: 'Payment method details (last 4 digits, brand, etc.)',
        readOnly: true,
      },
    },
    // Invoice and Receipt
    {
      name: 'invoiceUrl',
      type: 'text',
      admin: {
        description: 'URL to downloadable invoice',
        readOnly: true,
      },
    },
    {
      name: 'receiptUrl',
      type: 'text',
      admin: {
        description: 'URL to payment receipt',
        readOnly: true,
      },
    },
    // Timestamps
    {
      name: 'paidAt',
      type: 'date',
      admin: {
        description: 'When the payment was completed',
        readOnly: true,
      },
    },
    {
      name: 'failedAt',
      type: 'date',
      admin: {
        description: 'When the payment failed (if applicable)',
        readOnly: true,
      },
    },
    {
      name: 'refundedAt',
      type: 'date',
      admin: {
        description: 'When the order was refunded (if applicable)',
        readOnly: true,
      },
    },
    // Notes and Metadata
    {
      name: 'notes',
      type: 'textarea',
      admin: {
        description: 'Internal notes about this order',
      },
    },
    {
      name: 'metadata',
      type: 'json',
      admin: {
        description: 'Additional order metadata',
      },
    },
  ],
}
