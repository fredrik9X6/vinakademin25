import type { CollectionConfig } from 'payload'
import { adminOnly } from '../lib/access'

export const Transactions: CollectionConfig = {
  slug: 'transactions',
  admin: {
    useAsTitle: 'transactionId',
    defaultColumns: ['transactionId', 'user', 'type', 'amount', 'status', 'createdAt'],
    description: 'Financial transaction records for the platform',
  },
  access: {
    // Only admins can list all transactions
    read: ({ req }) => {
      const user = req.user

      if (!user) return false

      // Admins can read all transactions
      if (user.role === 'admin') return true

      // Regular users can only read their own transactions
      return {
        user: {
          equals: user.id,
        },
      }
    },
    // Only admins can create transactions manually
    // (most transactions will be created programmatically via Stripe webhooks)
    create: adminOnly,
    // Only admins can update transactions
    update: adminOnly,
    // Only admins can delete transactions (rarely needed)
    delete: adminOnly,
  },
  fields: [
    // Transaction identification
    {
      name: 'transactionId',
      type: 'text',
      required: true,
      unique: true,
      label: 'Transaction ID',
      admin: {
        description: 'Unique transaction ID (typically from payment processor)',
      },
    },
    // User relationship
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      hasMany: false,
      admin: {
        description: 'User associated with this transaction',
      },
    },
    // Transaction type
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Course Purchase', value: 'course_purchase' },
        { label: 'Subscription Initial', value: 'subscription_initial' },
        { label: 'Subscription Renewal', value: 'subscription_renewal' },
        { label: 'Subscription Upgrade', value: 'subscription_upgrade' },
        { label: 'Subscription Downgrade', value: 'subscription_downgrade' },
        { label: 'Refund', value: 'refund' },
        { label: 'Credit', value: 'credit' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Type of transaction',
        position: 'sidebar',
      },
    },
    // Transaction details
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Amount (SEK)',
      admin: {
        description: 'Transaction amount in SEK (negative for refunds)',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Completed', value: 'completed' },
        { label: 'Failed', value: 'failed' },
        { label: 'Refunded', value: 'refunded' },
        { label: 'Partially Refunded', value: 'partially_refunded' },
        { label: 'Disputed', value: 'disputed' },
      ],
      admin: {
        description: 'Current status of the transaction',
        position: 'sidebar',
      },
    },
    {
      name: 'paymentMethod',
      type: 'select',
      required: true,
      options: [
        { label: 'Credit Card', value: 'credit_card' },
        { label: 'Bank Transfer', value: 'bank_transfer' },
        { label: 'Invoice', value: 'invoice' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Apple Pay', value: 'apple_pay' },
        { label: 'Google Pay', value: 'google_pay' },
        { label: 'Klarna', value: 'klarna' },
        { label: 'Swish', value: 'swish' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Payment method used',
      },
    },
    {
      name: 'currency',
      type: 'select',
      required: true,
      defaultValue: 'sek',
      options: [
        { label: 'SEK', value: 'sek' },
        { label: 'EUR', value: 'eur' },
        { label: 'USD', value: 'usd' },
        { label: 'GBP', value: 'gbp' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Currency of the transaction',
        position: 'sidebar',
      },
    },
    // Related items
    {
      name: 'relatedCourse',
      type: 'relationship',
      relationTo: 'courses',
      hasMany: false,
      admin: {
        description: 'Related course for course purchases',
        condition: (data) => data?.type === 'course_purchase',
      },
    },
    // Removed to fix InvalidFieldRelationship error - will be added back later
    // Payment processor details
    {
      name: 'paymentProcessor',
      type: 'group',
      label: 'Payment Processor Details',
      admin: {
        description: 'Information from the payment processor',
      },
      fields: [
        {
          name: 'processor',
          type: 'select',
          required: true,
          options: [
            { label: 'Stripe', value: 'stripe' },
            { label: 'PayPal', value: 'paypal' },
            { label: 'Manual', value: 'manual' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'stripe',
        },
        {
          name: 'processorTransactionId',
          type: 'text',
          label: 'Processor Transaction ID',
          admin: {
            description: 'Transaction ID from the payment processor',
          },
        },
        {
          name: 'processorFee',
          type: 'number',
          label: 'Processor Fee',
          admin: {
            description: 'Fee charged by the payment processor',
          },
        },
        {
          name: 'processorResponse',
          type: 'json',
          label: 'Processor Response',
          admin: {
            description: 'Full response JSON from the payment processor',
          },
        },
      ],
    },
    // Additional information
    {
      name: 'notes',
      type: 'textarea',
      label: 'Internal Notes',
      admin: {
        description: 'Internal notes about this transaction',
      },
    },
    {
      name: 'customerNotes',
      type: 'textarea',
      label: 'Customer Notes',
      admin: {
        description: 'Notes visible to the customer',
      },
    },
  ],
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Validate transaction data
        if (data.type === 'refund' && data.amount > 0) {
          // Ensure refunds have negative amounts
          data.amount = -Math.abs(data.amount)
        }
        return data
      },
    ],
    afterChange: [
      async ({ req, doc, operation }) => {
        // This hook could update subscription status or other related records
        if (operation === 'create' && doc.status === 'completed') {
          // Handle completed transactions
        }
        return doc
      },
    ],
  },
  timestamps: true,
}
