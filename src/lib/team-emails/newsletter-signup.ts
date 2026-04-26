import { buildInternalEmailHTML, formatDateSv } from './shared'

export interface NewsletterSignupNotificationInput {
  email: string
  source?: string
  subscribedAt?: string | Date
  beehiivId?: string
}

export function buildNewsletterSignupEmail(input: NewsletterSignupNotificationInput): {
  subject: string
  html: string
} {
  const subject = `Ny prenumerant: ${input.email}`
  const html = buildInternalEmailHTML({
    heading: 'Ny nyhetsbrevsprenumerant',
    intro: `${input.email} har precis prenumererat på nyhetsbrevet.`,
    facts: [
      { label: 'E-post', value: input.email },
      { label: 'Källa', value: input.source || '—' },
      {
        label: 'Tidpunkt',
        value: input.subscribedAt ? formatDateSv(input.subscribedAt) : formatDateSv(new Date()),
      },
      ...(input.beehiivId ? [{ label: 'Beehiiv-ID', value: input.beehiivId }] : []),
    ],
  })
  return { subject, html }
}
