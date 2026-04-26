import { buildInternalEmailHTML, formatDateSv } from './shared'
import { getSiteURL } from '../site-url'

export interface UserRegisteredNotificationInput {
  userId: number | string
  email: string
  firstName?: string
  lastName?: string
  source?: string
  marketingOptIn?: boolean
  registeredAt?: string | Date
}

export function buildUserRegisteredEmail(input: UserRegisteredNotificationInput): {
  subject: string
  html: string
} {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(' ').trim() || '—'
  const subject = `Nytt konto: ${input.email}`
  const adminUrl = `${getSiteURL()}/admin/collections/users/${input.userId}`

  const html = buildInternalEmailHTML({
    heading: 'Ny användare registrerad',
    intro: `${fullName !== '—' ? `${fullName} (${input.email})` : input.email} har skapat ett konto.`,
    facts: [
      { label: 'Namn', value: fullName },
      { label: 'E-post', value: input.email },
      { label: 'Källa', value: input.source || 'registration' },
      {
        label: 'Marknadsföring',
        value: input.marketingOptIn === undefined ? '—' : input.marketingOptIn ? 'Ja' : 'Nej',
      },
      {
        label: 'Registrerad',
        value: input.registeredAt ? formatDateSv(input.registeredAt) : formatDateSv(new Date()),
      },
    ],
    adminLink: { href: adminUrl, label: 'Öppna i admin' },
  })

  return { subject, html }
}
