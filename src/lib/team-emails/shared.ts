import { emailBrandOrange } from '../email-cta'

export interface InternalEmailOptions {
  /** Short title rendered as the brand-strip header. */
  heading: string
  /** Short paragraph below the heading. */
  intro: string
  /** Key/value rows rendered as a clean table. */
  facts: Array<{ label: string; value: string }>
  /** Optional admin link button. */
  adminLink?: { href: string; label: string }
}

/**
 * Internal admin email shell — minimal, no branding theatrics.
 * Designed for quick scan: heading, intro line, fact table, optional admin CTA.
 */
export function buildInternalEmailHTML(opts: InternalEmailOptions): string {
  const factRows = opts.facts
    .map(
      (f) => `
      <tr>
        <td style="padding: 8px 0; color: #71717a; font-size: 13px; width: 140px; vertical-align: top;">${escapeHtml(f.label)}</td>
        <td style="padding: 8px 0; color: #18181b; font-size: 14px; vertical-align: top;">${escapeHtml(f.value)}</td>
      </tr>`,
    )
    .join('')

  const adminLink = opts.adminLink
    ? `
      <tr>
        <td style="padding-top: 24px;">
          <a href="${escapeAttr(opts.adminLink.href)}" target="_blank"
             style="display: inline-block; padding: 10px 18px; background-color: ${emailBrandOrange}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${escapeHtml(opts.adminLink.label)}
          </a>
        </td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e5e5;">
          <tr>
            <td style="padding: 20px 28px; background-color: ${emailBrandOrange}; color: #ffffff;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.9;">Vinakademin · Internt</div>
              <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">${escapeHtml(opts.heading)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 28px;">
              <p style="margin: 0 0 16px; color: #3f3f46; font-size: 14px; line-height: 1.55;">
                ${escapeHtml(opts.intro)}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${factRows}
                ${adminLink}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 28px; background-color: #fafafa; border-top: 1px solid #e5e5e5; color: #a1a1aa; font-size: 12px;">
              Detta är ett internt notifieringsmejl. Svara på det här mejlet för att kontakta personen direkt (Reply-To är inställd när möjligt).
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(input: string): string {
  return escapeHtml(input)
}

export function formatPriceSEK(amountInOre: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' }).format(
    amountInOre / 100,
  )
}

export function formatDateSv(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}
