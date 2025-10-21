import type { CollectionConfig } from 'payload'
import { adminFieldLevel, adminOnly, adminOrInstructorFieldLevel, adminOrSelf } from '../lib/access'
import { UserWineLists } from './UserWineLists'

type User = {
  id: string
  email: string
  firstName?: string
  role?: string
}

const resolveSiteURL = () => {
  const baseURL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PAYLOAD_PUBLIC_SITE_URL ||
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.vinakademin.se'
      : 'http://localhost:3000')

  return typeof baseURL === 'string' ? baseURL.replace(/\/$/, '') : ''
}

const SITE_URL = resolveSiteURL()

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'role', 'subscriptionStatus'],
  },
  auth: {
    cookies: {
      secure: process.env.NODE_ENV === 'production', // false in dev (HTTP), true in prod (HTTPS)
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // 'Lax' for dev (HTTP), 'None' for prod (if needed for cross-domain)
      domain: process.env.NODE_ENV === 'production' ? '.vinakademin.se' : 'localhost',
    },
    forgotPassword: {
      generateEmailHTML: (args) => {
        // Basic HTML email for password reset, to be enhanced later
        const { token, user } = args || {}
        return `
          <h1>Reset Your Password</h1>
          <p>Hello ${(user as any)?.firstName || 'there'},</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${SITE_URL}/reset-password?token=${token}">Reset Password</a></p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      },
    },
    verify: {
      generateEmailHTML: (args) => {
        const { token, user } = args || {}
        // Use Swedish path and link text
        return `
          <h1>Verifiera din e-post</h1>
          <p>Hej ${(user as any)?.firstName || 'där'},</p>
          <p>Klicka på länken nedan för att verifiera din e-postadress:</p>
          <p><a href="${SITE_URL}/verifiera-epost?token=${token}">Verifiera E-post</a></p>
          <p>Om du inte skapade detta konto, vänligen ignorera detta e-postmeddelande.</p>
        `
      },
    },
  },
  access: {
    // Enhanced access control for users collection
    read: ({ req }) => {
      const user = req.user as User | null

      // Admin can read all users
      if (user?.role === 'admin') return true

      // Instructors can read basic info about all users
      if (user?.role === 'instructor') {
        return true // Instructors can see all users, fields will be filtered in afterRead hook
      }

      // Users can read their own document
      return user
        ? {
            id: {
              equals: user.id,
            },
          }
        : false
    },
    // Anyone can create a user (register)
    create: () => true,
    // Admin can update any user, users can update themselves
    update: adminOrSelf,
    // Only admins can delete users
    delete: adminOnly,
  },
  fields: [
    // Profile Information
    {
      name: 'firstName',
      type: 'text',
      label: 'First Name',
      admin: {
        description: "User's first name",
      },
    },
    {
      name: 'lastName',
      type: 'text',
      label: 'Last Name',
      admin: {
        description: "User's last name",
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      label: 'Profile Picture',
      relationTo: 'media',
      admin: {
        description: "User's profile picture",
      },
    },
    {
      name: 'bio',
      type: 'textarea',
      label: 'Bio',
      admin: {
        description: 'Short user biography',
      },
    },
    // Role and Permissions
    {
      name: 'role',
      type: 'select',
      label: 'Role',
      defaultValue: 'user',
      required: true,
      access: {
        // Only admins can change user roles
        update: adminFieldLevel,
      },
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Instructor',
          value: 'instructor',
        },
        {
          label: 'Subscriber',
          value: 'subscriber',
        },
        {
          label: 'User',
          value: 'user',
        },
      ],
      admin: {
        description: 'User role determines permissions',
        position: 'sidebar',
      },
    },
    // Account Status
    {
      name: 'isVerified',
      type: 'checkbox',
      label: 'Email Verified',
      defaultValue: false,
      access: {
        // Only admins and instructors can manually verify users
        update: adminOrInstructorFieldLevel,
      },
      admin: {
        description: 'Has the user verified their email address?',
        position: 'sidebar',
      },
    },
    {
      name: 'accountStatus',
      type: 'select',
      label: 'Account Status',
      defaultValue: 'active',
      access: {
        // Only admins can change account status
        update: adminFieldLevel,
      },
      options: [
        {
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Suspended',
          value: 'suspended',
        },
        {
          label: 'Deactivated',
          value: 'deactivated',
        },
      ],
      admin: {
        description: 'Current status of the user account',
        position: 'sidebar',
      },
    },
    // Subscription Information
    {
      name: 'subscriptionStatus',
      type: 'select',
      label: 'Subscription Status',
      defaultValue: 'none',
      access: {
        // Only admins can change subscription status
        update: adminFieldLevel,
      },
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'Free Trial',
          value: 'free_trial',
        },
        {
          label: 'Active',
          value: 'active',
        },
        {
          label: 'Past Due',
          value: 'past_due',
        },
        {
          label: 'Canceled',
          value: 'canceled',
        },
      ],
      admin: {
        description: 'Current subscription status',
        position: 'sidebar',
      },
    },
    {
      name: 'subscriptionPlan',
      type: 'select',
      label: 'Subscription Plan',
      defaultValue: 'none',
      access: {
        // Only admins can change subscription plan
        update: adminFieldLevel,
      },
      options: [
        {
          label: 'None',
          value: 'none',
        },
        {
          label: 'Monthly',
          value: 'monthly',
        },
        {
          label: 'Annual',
          value: 'annual',
        },
      ],
      admin: {
        description: 'Type of subscription plan',
        position: 'sidebar',
      },
    },
    {
      name: 'subscriptionExpiry',
      type: 'date',
      label: 'Subscription Expiry',
      access: {
        // Only admins can change subscription expiry
        update: adminFieldLevel,
      },
      admin: {
        description: 'Date when the subscription expires',
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
    },
    // Wine Preferences
    {
      name: 'winePreferences',
      type: 'group',
      label: 'Wine Preferences',
      admin: {
        description: "User's wine preferences",
      },
      fields: [
        {
          name: 'favoriteGrapes',
          type: 'relationship',
          label: 'Favorite Grape Varieties',
          relationTo: 'grapes',
          hasMany: true,
          admin: {
            description: 'User preferred grape varieties',
          },
        },
        {
          name: 'favoriteRegions',
          type: 'relationship',
          label: 'Favorite Wine Regions',
          relationTo: 'regions',
          hasMany: true,
          admin: {
            description: 'User preferred wine regions',
          },
        },
        {
          name: 'preferredStyles',
          type: 'select',
          label: 'Preferred Wine Styles',
          hasMany: true,
          options: [
            { label: 'Lätta röda viner', value: 'light_red' },
            { label: 'Medeltunga röda viner', value: 'medium_red' },
            { label: 'Fylliga röda viner', value: 'full_red' },
            { label: 'Lätta vita viner', value: 'light_white' },
            { label: 'Fylliga vita viner', value: 'full_white' },
            { label: 'Mousserande viner', value: 'sparkling' },
            { label: 'Rosévin', value: 'rose' },
            { label: 'Sött vin', value: 'sweet' },
            { label: 'Starkvin', value: 'fortified' },
          ],
        },
        {
          name: 'tastingExperience',
          type: 'select',
          label: 'Tasting Experience Level',
          defaultValue: 'Nybörjare',
          options: [
            { label: 'Nybörjare', value: 'Nybörjare' },
            { label: 'Medel', value: 'Medel' },
            { label: 'Avancerad', value: 'Avancerad' },
            { label: 'Expert', value: 'Expert' },
          ],
        },
        {
          name: 'discoveryPreferences',
          type: 'select',
          label: 'Discovery Preferences',
          hasMany: true,
          options: [
            { label: 'Upptäck nya druvor', value: 'new_grapes' },
            { label: 'Utforska nya regioner', value: 'new_regions' },
            { label: 'Prova olika prisklasser', value: 'price_ranges' },
            { label: 'Lär dig om vinkultur', value: 'wine_culture' },
            { label: 'Få personliga rekommendationer', value: 'recommendations' },
            { label: 'Delta i virtuella provningar', value: 'virtual_tastings' },
          ],
        },
        {
          name: 'priceRange',
          type: 'select',
          label: 'Preferred Price Range',
          defaultValue: 'mid',
          options: [
            { label: 'Under 200 kr', value: 'budget' },
            { label: '200-500 kr', value: 'mid' },
            { label: '500-1000 kr', value: 'premium' },
            { label: 'Över 1000 kr', value: 'luxury' },
          ],
        },
        {
          name: 'tastingNotes',
          type: 'textarea',
          label: 'Personal Tasting Notes',
          admin: {
            description: 'User personal notes about wine preferences',
          },
        },
      ],
    },
    // Progress Tracking
    {
      name: 'courseProgress',
      type: 'array',
      label: 'Course Progress',
      admin: {
        description: "User's progress in enrolled courses",
      },
      fields: [
        {
          name: 'courseId',
          type: 'text',
          label: 'Course ID',
          required: true,
        },
        {
          name: 'progress',
          type: 'number',
          label: 'Progress Percentage',
          min: 0,
          max: 100,
          defaultValue: 0,
        },
        {
          name: 'lastAccessed',
          type: 'date',
          label: 'Last Accessed',
        },
        {
          name: 'completed',
          type: 'checkbox',
          label: 'Completed',
          defaultValue: false,
        },
      ],
    },
    // Privacy & Communication Preferences
    {
      name: 'notifications',
      type: 'group',
      label: 'Notification Preferences',
      admin: {
        description: "User's notification preferences",
      },
      fields: [
        // Email Notifications
        {
          name: 'email',
          type: 'group',
          label: 'Email Notifications',
          fields: [
            {
              name: 'courseProgress',
              type: 'checkbox',
              label: 'Course Progress Updates',
              defaultValue: true,
            },
            {
              name: 'newCourses',
              type: 'checkbox',
              label: 'New Course Announcements',
              defaultValue: true,
            },
            {
              name: 'wineRecommendations',
              type: 'checkbox',
              label: 'Wine Recommendations',
              defaultValue: true,
            },
            {
              name: 'tastingEvents',
              type: 'checkbox',
              label: 'Tasting Events',
              defaultValue: true,
            },
            {
              name: 'newsletter',
              type: 'checkbox',
              label: 'Newsletter',
              defaultValue: true,
            },
            {
              name: 'accountUpdates',
              type: 'checkbox',
              label: 'Account & Security Updates',
              defaultValue: true,
            },
          ],
        },
        // Push Notifications
        {
          name: 'push',
          type: 'group',
          label: 'Push Notifications',
          fields: [
            {
              name: 'courseReminders',
              type: 'checkbox',
              label: 'Course Reminders',
              defaultValue: true,
            },
            {
              name: 'tastingReminders',
              type: 'checkbox',
              label: 'Tasting Reminders',
              defaultValue: true,
            },
            {
              name: 'achievements',
              type: 'checkbox',
              label: 'Achievement Notifications',
              defaultValue: true,
            },
            {
              name: 'socialActivity',
              type: 'checkbox',
              label: 'Social Activity',
              defaultValue: false,
            },
          ],
        },
        // Platform Notifications
        {
          name: 'platform',
          type: 'group',
          label: 'Platform Notifications',
          fields: [
            {
              name: 'inAppMessages',
              type: 'checkbox',
              label: 'In-App Messages',
              defaultValue: true,
            },
            {
              name: 'systemAnnouncements',
              type: 'checkbox',
              label: 'System Announcements',
              defaultValue: true,
            },
            {
              name: 'maintenanceAlerts',
              type: 'checkbox',
              label: 'Maintenance Alerts',
              defaultValue: true,
            },
            {
              name: 'featureUpdates',
              type: 'checkbox',
              label: 'Feature Updates',
              defaultValue: false,
            },
          ],
        },
      ],
    },
  ],
  timestamps: true,
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        if (operation !== 'create') return doc
        const payload = req.payload
        const userId = doc.id
        const systemLists = [
          { name: 'Favorites', isSystem: true },
          { name: 'Wishlist', isSystem: true },
        ]
        for (const list of systemLists) {
          // Check if the list already exists for this user
          const existing = await payload.find({
            collection: UserWineLists.slug as any, // TODO: Remove 'as any' if Payload exposes custom collection slugs
            where: {
              and: [
                { user: { equals: userId } },
                { name: { equals: list.name } },
                { isSystem: { equals: true } },
              ],
            },
            limit: 1,
          })
          if (!existing?.docs?.length) {
            await payload.create({
              collection: UserWineLists.slug as any, // TODO: Remove 'as any' if Payload exposes custom collection slugs
              data: {
                user: userId,
                name: list.name,
                isSystem: true,
              },
              req,
            })
          }
        }
        return doc
      },
    ],
  },
}
