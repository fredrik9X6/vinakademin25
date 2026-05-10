import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  emailLightOutlineButton,
  escapeHtml,
} from '../email-cta'
import { getSiteURL } from '../site-url'

export interface EbookDeliveryEmailInput {
  /** Subscriber's email — used only as a hint in body copy. Optional. */
  email?: string
  /** Optional override; defaults to /lead-magnets/det-enda-du-behover-veta-om-vin.pdf on the live site. */
  downloadUrl?: string
  /** Optional override; defaults to the canonical landing page. */
  landingUrl?: string
}

const DEFAULT_PDF_PATH = '/lead-magnets/det-enda-du-behover-veta-om-vin.pdf'
const DEFAULT_LANDING_PATH = '/grunderna-i-vin'

export function buildEbookGrundernaIVinEmail(input: EbookDeliveryEmailInput = {}): {
  subject: string
  html: string
  text: string
} {
  const siteUrl = getSiteURL()
  const downloadUrl = input.downloadUrl || `${siteUrl}${DEFAULT_PDF_PATH}`
  const landingUrl = input.landingUrl || `${siteUrl}${DEFAULT_LANDING_PATH}/tack`

  const subject = 'Här är din e-bok — Det enda du behöver veta om vin'

  const text = [
    'Tack för att du anmälde dig till Vinakademins nyhetsbrev!',
    '',
    'Här är din kopia av e-boken "Det enda du behöver veta om vin" (PDF, 14 sidor):',
    downloadUrl,
    '',
    'Du kan även ladda ner från denna sida:',
    landingUrl,
    '',
    'Boken är skriven för att läsas i ett svep — ungefär 20 minuter — och täcker:',
    '· Del 1: Vin för alla',
    '· Del 2: De 5 S:en — provningsmetoden',
    '· Del 3: Mat & Vin',
    '· Del 4: BLIK — kvalitetskollen',
    '· Del 5: Din kickstart-lista',
    '',
    'Skål!',
    'Vinakademin-teamet',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
              <div style="font-size: 12px; color: #ffffff; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;">
                Gratis e-bok &middot; 14 sidor
              </div>
              <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15;">
                Vinakademin
              </h1>
            </td>
          </tr>

          <!-- Hero copy -->
          <tr>
            <td style="padding: 40px 40px 8px;">
              <h2 style="margin: 0 0 12px; color: #18181b; font-size: 26px; font-weight: 600; line-height: 1.2;">
                Sk&aring;l &mdash; h&auml;r &auml;r din e-bok!
              </h2>
              <p style="margin: 0 0 8px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                Tack f&ouml;r att du anm&auml;lde dig till v&aring;rt nyhetsbrev. Som
                lovat &mdash; <strong>Det enda du beh&ouml;ver veta om vin</strong>,
                en 14-sidig kickstart till vinens v&auml;rld.
              </p>
              <p style="margin: 16px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Klicka p&aring; knappen f&ouml;r att ladda ner PDF:en. Den fungerar
                lika bra i mobilen som utskriven vid sidan av glaset.
              </p>
            </td>
          </tr>

          <!-- Primary CTA -->
          <tr>
            <td align="center" style="padding: 28px 40px 8px;">
              ${emailPrimaryCtaButton(downloadUrl, 'Ladda ner PDF')}
            </td>
          </tr>

          <!-- Secondary link -->
          <tr>
            <td align="center" style="padding: 8px 40px 32px;">
              ${emailLightOutlineButton(landingUrl, 'Eller &ouml;ppna p&aring; webben')}
            </td>
          </tr>

          <!-- What's inside -->
          <tr>
            <td style="padding: 0 40px 16px;">
              <div style="border-top: 1px solid #e5e5e5; padding-top: 28px;">
                <div style="font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 12px;">
                  Vad du f&aring;r
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${chapterRow('01', 'Vin f&ouml;r alla', 'Varf&ouml;r vin inte beh&ouml;ver vara sv&aring;rt.')}
                  ${chapterRow('02', 'De 5 S:en', 'Se &middot; Snurra &middot; Sniffa &middot; Smaka &middot; Sammanfatta.')}
                  ${chapterRow('03', 'Mat &amp; Vin', 'Bortom &laquo;vitt till fisk, r&ouml;tt till k&ouml;tt&raquo;.')}
                  ${chapterRow('04', 'BLIK', 'Fyra fr&aring;gor som skiljer ett bra vin fr&aring;n ett stort.')}
                  ${chapterRow('05', 'Kickstart-listan', '5 viner som bygger ditt referensbibliotek.')}
                </table>
              </div>
            </td>
          </tr>

          <!-- Tip / closing -->
          <tr>
            <td style="padding: 16px 40px 40px;">
              <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                <strong style="color: ${emailBrandOrange};">Tips:</strong> &Ouml;ppna en flaska
                och prova metoden direkt &mdash; det &auml;r d&aring; den fastnar.
                ${input.email ? `Vi skickade boken till <strong>${escapeHtml(input.email)}</strong>.` : ''}
              </p>
              <p style="margin: 24px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                Fr&aring;gor? Svara p&aring; det h&auml;r mejlet eller skriv till
                <a href="mailto:hej@vinakademin.se" style="color: ${emailBrandOrange}; text-decoration: none;">hej@vinakademin.se</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 32px; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                Sk&aring;l!<br>
                <strong style="color: ${emailBrandOrange};">Vinakademin-teamet</strong>
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px; line-height: 1.5; text-align: center;">
                &copy; ${new Date().getFullYear()} Vinakademin &middot;
                <a href="${siteUrl}" style="color: ${emailBrandOrange}; text-decoration: none;">vinakademin.se</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, html, text }
}

function chapterRow(num: string, title: string, summary: string): string {
  return `
    <tr>
      <td style="padding: 8px 0; vertical-align: top; width: 44px;">
        <div style="display: inline-block; width: 32px; height: 32px; line-height: 32px; text-align: center; border-radius: 8px; background-color: #fff7ed; color: ${emailBrandOrange}; font-size: 13px; font-weight: 700;">
          ${num}
        </div>
      </td>
      <td style="padding: 8px 0; vertical-align: top;">
        <div style="color: #18181b; font-size: 14px; font-weight: 600; line-height: 1.4;">${title}</div>
        <div style="color: #71717a; font-size: 13px; line-height: 1.5; margin-top: 2px;">${summary}</div>
      </td>
    </tr>`
}

