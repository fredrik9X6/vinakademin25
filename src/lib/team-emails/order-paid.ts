import { buildInternalEmailHTML, formatDateSv, formatPriceSEK } from './shared'
import { getSiteURL } from '../site-url'

export interface OrderPaidNotificationInput {
  orderId: number | string
  orderNumber?: string
  email: string
  customerName?: string
  courseTitle: string
  amount: number
  currency?: string
  discountAmount?: number
  discountCode?: string
  paidAt?: string | Date
  checkoutMode?: 'guest' | 'user' | string
  isNewUser?: boolean
}

export function buildOrderPaidEmail(input: OrderPaidNotificationInput): {
  subject: string
  html: string
} {
  const subject = `Nytt köp: ${input.courseTitle} (${input.email})`
  const adminUrl = `${getSiteURL()}/admin/collections/orders/${input.orderId}`

  const facts: Array<{ label: string; value: string }> = [
    { label: 'Vinprovning', value: input.courseTitle },
    {
      label: 'Belopp',
      value:
        input.currency && input.currency.toUpperCase() !== 'SEK'
          ? `${input.amount.toFixed(2)} ${input.currency.toUpperCase()}`
          : formatPriceSEK(input.amount),
    },
  ]

  if (input.discountAmount && input.discountAmount > 0) {
    facts.push({
      label: 'Rabatt',
      value: `${formatPriceSEK(input.discountAmount)}${
        input.discountCode ? ` (${input.discountCode})` : ''
      }`,
    })
  }

  facts.push(
    { label: 'Kund', value: input.customerName || '—' },
    { label: 'E-post', value: input.email },
    {
      label: 'Köptyp',
      value: input.checkoutMode === 'guest' ? 'Gäst' : 'Inloggad användare',
    },
  )

  if (input.isNewUser) {
    facts.push({ label: 'Status', value: 'Ny användare ✨' })
  }

  if (input.orderNumber) {
    facts.push({ label: 'Ordernummer', value: input.orderNumber })
  }

  facts.push({
    label: 'Tidpunkt',
    value: input.paidAt ? formatDateSv(input.paidAt) : formatDateSv(new Date()),
  })

  const html = buildInternalEmailHTML({
    heading: 'Nytt genomfört köp',
    intro: `${input.email} har precis köpt "${input.courseTitle}".`,
    facts,
    adminLink: { href: adminUrl, label: 'Öppna order i admin' },
  })

  return { subject, html }
}
