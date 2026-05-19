import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  escapeHtml,
} from '../email-cta'
import { getSiteURL } from '../site-url'
import { VINAKADEMIN_PREMIUM } from '../stripe-products'

export interface WelcomePremiumEmailInput {
  /** Recipient's first name (or null — falls back to "Hej!"). */
  firstName: string | null
  /** Which plan they're on, drives the "Förnyas …" line. */
  plan: 'monthly' | 'annual' | null
  /** Next renewal date — shown so the user knows the calendar. */
  renewsOn: Date | null
}

function formatRenewalDate(d: Date | null): string | null {
  if (!d) return null
  try {
    return d.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return null
  }
}

export function buildWelcomePremiumEmail(input: WelcomePremiumEmailInput): {
  subject: string
  html: string
  text: string
} {
  const siteUrl = getSiteURL()
  const firstName = input.firstName?.trim() ? input.firstName.trim().split(/\s+/)[0]! : null
  const greeting = firstName ? `Hej ${escapeHtml(firstName)}!` : 'Hej!'
  const planLabel = input.plan === 'annual' ? 'Årlig' : input.plan === 'monthly' ? 'Månadsvis' : null
  const renews = formatRenewalDate(input.renewsOn)
  const planLine =
    planLabel && renews
      ? `Plan: ${planLabel} · Förnyas ${renews}.`
      : planLabel
        ? `Plan: ${planLabel}.`
        : null

  const subject = 'Välkommen till Vinakademin+'

  const featureItems = VINAKADEMIN_PREMIUM.features
    .map(
      (f) => `
        <tr>
          <td style="padding: 6px 0; color: #18181b; font-size: 15px; line-height: 1.55;">
            <span style="display: inline-block; width: 24px; color: ${emailBrandOrange}; font-weight: 700;">✓</span>
            ${escapeHtml(f)}
          </td>
        </tr>`,
    )
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
      <tr>
        <td align="center" style="padding: 40px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <tr>
              <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">
                  Vinakademin+
                </h1>
              </td>
            </tr>

            <tr>
              <td style="padding: 40px 40px 24px;">
                <h2 style="margin: 0 0 16px; color: #18181b; font-size: 24px; font-weight: 600; line-height: 1.3;">
                  ${greeting}
                </h2>
                <p style="margin: 0 0 8px; color: #18181b; font-size: 16px; line-height: 1.6;">
                  Tack för att du blev medlem. Du har nu full tillgång till hela biblioteket av provningar, plus verktygen för att hosta egna.
                </p>
                ${
                  planLine
                    ? `<p style="margin: 8px 0 0; color: #71717a; font-size: 14px;">${planLine}</p>`
                    : ''
                }
              </td>
            </tr>

            <tr>
              <td style="padding: 0 40px 24px;">
                <h3 style="margin: 0 0 12px; color: #18181b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">
                  Det här ingår nu
                </h3>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${featureItems}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 40px 32px;">
                <h3 style="margin: 0 0 16px; color: #18181b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #71717a;">
                  Kom igång
                </h3>
                <div style="margin-bottom: 12px;">
                  ${emailPrimaryCtaButton(`${siteUrl}/provningsmallar`, 'Bläddra i biblioteket')}
                </div>
                <div style="margin-bottom: 12px;">
                  ${emailPrimaryCtaButton(`${siteUrl}/skapa-provning`, 'Skapa din första provning')}
                </div>
                <div>
                  ${emailPrimaryCtaButton(`${siteUrl}/profil`, 'Anpassa din profil')}
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 40px 40px;">
                <p style="margin: 0; color: #71717a; font-size: 13px; line-height: 1.6; text-align: center;">
                  Hantera prenumerationen när som helst på
                  <a href="${siteUrl}/prenumeration" style="color: ${emailBrandOrange}; text-decoration: none;">${siteUrl}/prenumeration</a>.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
            Vinakademin
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const textLines: string[] = [
    greeting,
    '',
    'Tack för att du blev medlem. Du har nu full tillgång till hela biblioteket av provningar, plus verktygen för att hosta egna.',
  ]
  if (planLine) textLines.push('', planLine)
  textLines.push('', 'Det här ingår:')
  for (const f of VINAKADEMIN_PREMIUM.features) {
    textLines.push(`  ✓ ${f}`)
  }
  textLines.push('', 'Kom igång:')
  textLines.push(`  · Bläddra i biblioteket — ${siteUrl}/provningsmallar`)
  textLines.push(`  · Skapa din första provning — ${siteUrl}/skapa-provning`)
  textLines.push(`  · Anpassa din profil — ${siteUrl}/profil`)
  textLines.push('', `Hantera prenumerationen: ${siteUrl}/prenumeration`)

  return { subject, html, text: textLines.join('\n') }
}
