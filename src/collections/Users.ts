import type { CollectionConfig } from 'payload'
import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  emailWarmCalloutStyle,
} from '../lib/email-cta'
import { getSiteURL, getCookieDomain } from '../lib/site-url'
import { adminFieldLevel, adminOrInstructorFieldLevel } from '../lib/access'
import { sendTeamNotification } from '../lib/notify-team'
import { buildUserRegisteredEmail } from '../lib/team-emails/user-registered'
import { subscribeAndMirror, unsubscribeAndMirror } from '../lib/subscribers'
import { recordEvent } from '../lib/events'
import { loggerFor } from '../lib/logger'

const usersHookLog = loggerFor('collections-users-hooks')

type User = {
  id: string
  email: string
  firstName?: string
  role?: string
}

const SITE_URL = getSiteURL()

// Build cookie config with conditional domain
const cookieDomain = getCookieDomain()
const cookieConfig: {
  secure: boolean
  sameSite: 'Lax' | 'Strict' | 'None'
  domain?: string
} = {
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Lax', // Use 'Lax' for better security and Cloudflare compatibility (changed from 'None')
  // Domain is omitted by default to work better with Cloudflare and proxies
  // Set COOKIE_DOMAIN env var if you need cross-subdomain cookies (e.g., '.vinakademin.se')
}

if (cookieDomain) {
  cookieConfig.domain = cookieDomain
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    group: 'Users & Progress',
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'role', 'subscriptionStatus'],
  },
  auth: {
    cookies: cookieConfig,
    // Default Payload JWT lifetime is 2h, which is short for a consumer site
    // where members come back over a day-long tasting prep session. Extend
    // to 30 days; the cookie is httpOnly + secure + SameSite=Lax.
    tokenExpiration: 60 * 60 * 24 * 30,
    forgotPassword: {
      generateEmailSubject: () => {
        return 'Återställ ditt lösenord - Vinakademin'
      },
      generateEmailHTML: (args) => {
        const { token, user } = args || {}
        const firstName = (user as any)?.firstName || ''
        const resetUrl = `${SITE_URL}/aterstall-losenord?token=${token}`

        return `
          <!DOCTYPE html>
          <html lang="sv">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Återställ ditt lösenord - Vinakademin</title>
            <!--[if mso]>
            <style type="text/css">
              body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <!-- Main Container -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                          🍷 Vinakademin
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 40px 32px;">
                        <h2 style="margin: 0 0 16px; color: #18181b; font-size: 24px; font-weight: 600; line-height: 1.3;">
                          Återställ ditt lösenord
                        </h2>
                        
                        <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                          Hej${firstName ? ` ${firstName}` : ''},
                        </p>
                        
                        <p style="margin: 0 0 32px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                          Vi har fått en förfrågan om att återställa lösenordet för ditt konto. Klicka på knappen nedan för att skapa ett nytt lösenord:
                        </p>

                        <!-- CTA Button -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 0 0 32px;">
                              ${emailPrimaryCtaButton(resetUrl, 'Återställ lösenord')}
                            </td>
                          </tr>
                        </table>

                        <!-- Alternative Link -->
                        <p style="margin: 0 0 24px; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:
                        </p>
                        <p style="margin: 0 0 32px; padding: 16px; background-color: #fafafa; border-radius: 6px; word-break: break-all;">
                          <a href="${resetUrl}" style="color: #FB914C; text-decoration: none; font-size: 14px;">
                            ${resetUrl}
                          </a>
                        </p>

                        <!-- Security Note -->
                        <div style="padding: 20px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 32px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                            <strong>⚠️ Säkerhetsmeddelande:</strong> Om du inte begärde denna återställning, ignorera detta e-postmeddelande. Ditt lösenord kommer att förbli oförändrat.
                          </p>
                        </div>

                        <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Denna länk är giltig i 24 timmar av säkerhetsskäl.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0 0 12px; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                          Med vänliga hälsningar,<br>
                          <strong style="color: #FB914C;">Fredrik & Max</strong>
                        </p>
                        <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5; text-align: center;">
                          © ${new Date().getFullYear()} Vinakademin. Alla rättigheter förbehållna.<br>
                          <a href="${SITE_URL}" style="color: #FB914C; text-decoration: none;">www.vinakademin.se</a>
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      },
    },
    verify: {
      generateEmailSubject: () => {
        return 'Verifiera din e-postadress - Vinakademin'
      },
      generateEmailHTML: (args) => {
        const { token, user } = args || {}
        const firstName = (user as any)?.firstName || ''
        const verifyUrl = `${SITE_URL}/verifiera-epost?token=${token}`

        return `
          <!DOCTYPE html>
          <html lang="sv">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verifiera din e-post - Vinakademin</title>
            <!--[if mso]>
            <style type="text/css">
              body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
            </style>
            <![endif]-->
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <!-- Main Container -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    
                    <!-- Header with Logo -->
                    <tr>
                      <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                          🍷 Vinakademin
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 40px 32px;">
                        <h2 style="margin: 0 0 16px; color: #18181b; font-size: 24px; font-weight: 600; line-height: 1.3;">
                          Välkommen till Vinakademin! 🎉
                        </h2>
                        
                        <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                          Hej${firstName ? ` ${firstName}` : ''},
                        </p>
                        
                        <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                          Tack för att du skapade ett konto hos oss! Vi är glada att ha dig med på resan att upptäcka vinvärlden på ett enkelt och opretentiöst sätt.
                        </p>

                        <p style="margin: 0 0 32px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                          För att komma igång behöver vi bara verifiera din e-postadress. Klicka på knappen nedan:
                        </p>

                        <!-- CTA Button -->
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 0 0 32px;">
                              ${emailPrimaryCtaButton(verifyUrl, 'Verifiera e-post')}
                            </td>
                          </tr>
                        </table>

                        <!-- Alternative Link -->
                        <p style="margin: 0 0 24px; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Om knappen inte fungerar, kopiera och klistra in denna länk i din webbläsare:
                        </p>
                        <p style="margin: 0 0 32px; padding: 16px; background-color: #fafafa; border-radius: 6px; word-break: break-all;">
                          <a href="${verifyUrl}" style="color: #FB914C; text-decoration: none; font-size: 14px;">
                            ${verifyUrl}
                          </a>
                        </p>

                        <!-- What's Next -->
                        <div style="${emailWarmCalloutStyle()}">
                          <h3 style="margin: 0 0 16px; color: #FB914C; font-size: 18px; font-weight: 600;">
                            Vad händer sen?
                          </h3>
                          <ul style="margin: 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.8;">
                            <li>Utforska våra vinprovningar</li>
                            <li>Lär dig om vin på ett roligt sätt</li>
                            <li>Få tillgång till exklusivt innehåll</li>
                            <li>Delta i vår community av vinentusiaster</li>
                          </ul>
                        </div>

                        <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                          Om du inte skapade detta konto, kan du ignorera detta e-postmeddelande.
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
                        <p style="margin: 0 0 12px; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                          Vi ser fram emot att ha dig med oss!<br>
                          <strong style="color: #FB914C;">Vinakademin-teamet</strong>
                        </p>
                        <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5; text-align: center;">
                          © ${new Date().getFullYear()} Vinakademin. Alla rättigheter förbehållna.<br>
                          <a href="${SITE_URL}" style="color: #FB914C; text-decoration: none;">www.vinakademin.se</a>
                        </p>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `
      },
    },
  },
  access: {
    // Restrict the Payload admin panel to admin-role users only.
    // Without this, any authenticated user can enter /admin and browse
    // collection lists (subject to per-collection read access).
    // Note: this is a narrower type than collection CRUD access (must return
    // boolean, not query constraints), so we inline rather than use adminOnly.
    admin: ({ req }) => req.user?.role === 'admin',
    // Bare minimum access control - simplified
    read: ({ req }) => {
      // Allow admin to read all
      if (req.user?.role === 'admin') return true
      // Users can read their own document
      if (req.user) {
        return {
          id: {
            equals: req.user.id,
          },
        }
      }
      // Allow form building (no user context = admin UI preparing form)
      // This prevents "Unauthorized" errors during form state building
      return true
    },
    // Anyone can create a user (register)
    create: () => true,
    // Allow update for form building - security handled in hooks
    update: () => true,
    // Only admins can delete users
    delete: ({ req }) => req.user?.role === 'admin',
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
      name: 'handle',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Public profile slug — lowercase, 3–30 chars, regex [a-z0-9-]. Empty = profile not opted in.',
      },
      validate: (value: unknown) => {
        if (value == null || value === '') return true
        const s = String(value).toLowerCase().trim()
        if (s.length < 3 || s.length > 30) return 'Användarnamnet måste vara 3–30 tecken.'
        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s))
          return 'Användarnamnet får bara innehålla a–z, 0–9 och bindestreck.'
        return true
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (typeof value === 'string') return value.toLowerCase().trim() || null
            return value
          },
        ],
      },
    },
    {
      name: 'profilePublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'When checked AND handle is set, the user\'s /profil/<handle> page is publicly visible.',
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
      maxLength: 280,
      admin: {
        description: 'Optional bio shown on the public profile page.',
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
    {
      name: 'onboarding',
      type: 'group',
      label: 'Onboarding',
      fields: [
        {
          name: 'goal',
          type: 'select',
          label: 'Primärt mål',
          options: [
            { label: 'Lära mig grunderna i vin', value: 'learn_basics' },
            { label: 'Bli bättre på mat- och vinkombinationer', value: 'pairing_confident' },
            { label: 'Utforska nya regioner och druvor', value: 'explore_regions' },
            { label: 'Bygga djupare expertkunskap', value: 'deep_knowledge' },
          ],
        },
        {
          name: 'completedAt',
          type: 'date',
          label: 'Onboarding slutförd',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'skippedAt',
          type: 'date',
          label: 'Onboarding hoppad över',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'source',
          type: 'select',
          label: 'Onboarding-källa',
          options: [
            { label: 'Standard registrering', value: 'registration' },
            { label: 'Gästköp', value: 'guest_checkout' },
          ],
        },
      ],
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
            { label: 'Naturvin', value: 'natural' },
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
      async ({ req, doc, operation, previousDoc }) => {
        if (operation === 'create') {
          // Heads-up email + Beehiiv subscribe (if user opted into marketing) +
          // CRM timeline entry.
          void (async () => {
            const marketingOptIn =
              (doc as any)?.notifications?.email?.newsletter ?? undefined
            const source = (doc as any)?.onboarding?.source || 'registration'

            try {
              const { subject, html } = buildUserRegisteredEmail({
                userId: doc.id,
                email: doc.email,
                firstName: (doc as any).firstName,
                lastName: (doc as any).lastName,
                source,
                marketingOptIn,
                registeredAt: (doc as any).createdAt || new Date().toISOString(),
              })
              await sendTeamNotification({
                payload: req.payload,
                subject,
                html,
                replyTo: doc.email,
              })
            } catch (err) {
              usersHookLog.error({ err, userId: doc.id }, 'user_registered_notify_failed')
            }

            await recordEvent({
              payload: req.payload,
              type: 'account_created',
              contactEmail: doc.email,
              label: 'Account created',
              userId: doc.id,
              source: 'web',
              metadata: { source, marketingOptIn },
            })

            if ((doc as any)?.notifications?.email?.newsletter === true) {
              try {
                await subscribeAndMirror({
                  payload: req.payload,
                  email: doc.email,
                  source: 'registration',
                  relatedUserId: doc.id,
                })
              } catch (err) {
                usersHookLog.error({ err, userId: doc.id }, 'user_registered_beehiiv_failed')
              }
            }
          })()

          return doc
        }

        if (operation === 'update') {
          // Email-verification flip → CRM event.
          const verifiedBefore = (previousDoc as any)?._verified
          const verifiedAfter = (doc as any)?._verified
          if (!verifiedBefore && verifiedAfter) {
            void recordEvent({
              payload: req.payload,
              type: 'account_verified',
              contactEmail: doc.email,
              label: 'Email verified',
              userId: doc.id,
              source: 'system',
            })
          }

          // Sync Beehiiv when the marketing flag flips. We only run this when
          // there's a real change to avoid a flood of no-op API calls.
          const before = (previousDoc as any)?.notifications?.email?.newsletter
          const after = (doc as any)?.notifications?.email?.newsletter
          const emailChanged =
            (previousDoc as any)?.email && (previousDoc as any).email !== doc.email

          if (before !== after) {
            void (async () => {
              try {
                if (after === true) {
                  await subscribeAndMirror({
                    payload: req.payload,
                    email: doc.email,
                    source: 'profile',
                    relatedUserId: doc.id,
                  })
                } else {
                  await unsubscribeAndMirror({
                    payload: req.payload,
                    email: doc.email,
                  })
                }
              } catch (err) {
                usersHookLog.error(
                  { err, userId: doc.id, before, after },
                  'user_marketing_sync_failed',
                )
              }

              await recordEvent({
                payload: req.payload,
                type: 'marketing_opt_in_changed',
                contactEmail: doc.email,
                label: after === true ? 'Opted in to marketing' : 'Opted out of marketing',
                userId: doc.id,
                source: 'web',
                metadata: { before, after },
              })
            })()
          }

          // If the user changed their email and they're currently opted-in,
          // unsubscribe the old address from Beehiiv. We don't auto-subscribe
          // the new one — the user can re-confirm via profile if they want.
          if (emailChanged && before === true) {
            void (async () => {
              try {
                await unsubscribeAndMirror({
                  payload: req.payload,
                  email: (previousDoc as any).email,
                })
              } catch (err) {
                usersHookLog.error(
                  { err, userId: doc.id },
                  'user_email_change_beehiiv_cleanup_failed',
                )
              }
            })()
          }

          return doc
        }

        return doc
      },
    ],
    // TEMPORARILY DISABLED - Testing if hooks are causing the 'lockedState' error
    // beforeChange: [
    //   async ({ req, operation, originalDoc, data }) => {
    //     // Always return data early if form building (no user context)
    //     if (!req.user) return data
    //
    //     // Only enforce for updates (creates are open for registration)
    //     if (operation !== 'update') return data
    //     const user = req.user
    //     // Admin can update any user
    //     if (user?.role === 'admin') {
    //       return data
    //     }
    //     // Users can only update themselves
    //     if (originalDoc && String(user.id) === String(originalDoc.id)) {
    //       return data
    //     }
    //     throw new Error('You can only update your own profile')
    //   },
    // ],
    // afterChange: [
    //   async ({ req, doc, operation }) => {
    //     // Handle creation - create system lists
    //     if (operation === 'create') {
    //       const payload = req.payload
    //       const userId = doc.id
    //       const systemLists = [
    //         { name: 'Favorites', isSystem: true },
    //         { name: 'Wishlist', isSystem: true },
    //       ]
    //       for (const list of systemLists) {
    //         // Check if the list already exists for this user
    //         const existing = await payload.find({
    //           collection: 'user-wine-lists',
    //           where: {
    //             and: [
    //               { user: { equals: userId } },
    //               { name: { equals: list.name } },
    //               { isSystem: { equals: true } },
    //             ],
    //           },
    //           limit: 1,
    //         })
    //         if (!existing?.docs?.length) {
    //           await payload.create({
    //             collection: 'user-wine-lists',
    //             data: {
    //               user: userId,
    //               name: list.name,
    //               isSystem: true,
    //             },
    //             req,
    //           })
    //         }
    //       }
    //     }
    //     // Always return doc - PayloadCMS needs this for form state management
    //     return doc
    //   },
    // ],
  },
}
