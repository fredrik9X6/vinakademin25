import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  escapeHtml,
} from '../email-cta'

export interface BlindkampInvitationInput {
  battleTitle: string
  themeDescription: string | null
  themeLabel: string
  submissionDeadline: Date | null
  sessionDate: Date | null
  hostName: string
  submissionUrl: string
}

function formatDate(d: Date | null): string | null {
  if (!d) return null
  try {
    return d.toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch {
    return null
  }
}

export function buildBlindkampInvitationEmail(input: BlindkampInvitationInput): {
  subject: string
  html: string
  text: string
} {
  const subject = `Inbjudan till blindkamp: ${input.battleTitle}`
  const deadline = formatDate(input.submissionDeadline)
  const sessionDate = formatDate(input.sessionDate)

  const html = `<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5"><tr><td align="center" style="padding:40px 20px">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px">
        <tr><td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700">Blindkamp</h1>
        </td></tr>
        <tr><td style="padding:32px 40px 16px">
          <h2 style="margin:0 0 12px;color:#18181b;font-size:22px">${escapeHtml(input.battleTitle)}</h2>
          <p style="margin:0 0 8px;color:#71717a;font-size:14px">Tema: ${escapeHtml(input.themeLabel)}</p>
          ${input.themeDescription ? `<p style="margin:0 0 8px;color:#71717a;font-size:14px">${escapeHtml(input.themeDescription)}</p>` : ''}
          ${deadline ? `<p style="margin:8px 0 0;color:#71717a;font-size:14px">Sista dag att lämna in: ${escapeHtml(deadline)}</p>` : ''}
          ${sessionDate ? `<p style="margin:4px 0 0;color:#71717a;font-size:14px">Provning: ${escapeHtml(sessionDate)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:8px 40px 32px">
          <p style="margin:0 0 16px;color:#18181b;font-size:15px">${escapeHtml(input.hostName)} har bjudit in dig. Välj ditt vin nu — det förblir hemligt tills provningen.</p>
          ${emailPrimaryCtaButton(input.submissionUrl, 'Välj ditt vin')}
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`

  const textParts: string[] = [
    input.battleTitle,
    `Tema: ${input.themeLabel}`,
  ]
  if (deadline) textParts.push(`Sista dag: ${deadline}`)
  if (sessionDate) textParts.push(`Provning: ${sessionDate}`)
  textParts.push('', `Välj ditt vin: ${input.submissionUrl}`)

  return { subject, html, text: textParts.join('\n') }
}

const WINE_TYPE_LABELS: Record<string, string> = {
  any: 'Vilken som',
  red: 'Rött',
  white: 'Vitt',
  rose: 'Rosé',
  sparkling: 'Mousserande',
  orange: 'Orange',
  dessert: 'Dessert',
}

export function describeTheme(theme: {
  wineType: string
  priceMinSek?: number | null
  priceMaxSek?: number | null
}): string {
  const parts: string[] = [WINE_TYPE_LABELS[theme.wineType] || theme.wineType]
  if (theme.priceMaxSek && theme.priceMinSek) {
    parts.push(`${theme.priceMinSek}–${theme.priceMaxSek} kr`)
  } else if (theme.priceMaxSek) {
    parts.push(`under ${theme.priceMaxSek} kr`)
  } else if (theme.priceMinSek) {
    parts.push(`över ${theme.priceMinSek} kr`)
  }
  return parts.join(', ')
}
