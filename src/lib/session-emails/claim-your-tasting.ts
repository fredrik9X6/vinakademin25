import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  escapeHtml,
} from '../email-cta'
import { getSiteURL } from '../site-url'

export interface ClaimYourTastingEmailInput {
  /** Participant's nickname; used for personalized subject + greeting. */
  nickname?: string | null
  /** Title of the wine tasting (course) the participant attended. */
  courseTitle: string
  /** Pre-built /registrera URL with all claim params already encoded. */
  claimUrl: string
}

/**
 * Renders the post-tasting "save your reviews" email.
 * Mirrors the visual + tonal beats of the in-app `ClaimYourTastingCard`:
 * same 3-bullet list, same primary CTA label, same fine-print footer.
 */
export function buildClaimYourTastingEmail(
  input: ClaimYourTastingEmailInput,
): { subject: string; html: string; text: string } {
  const siteUrl = getSiteURL()
  const firstName =
    input.nickname && input.nickname.trim()
      ? input.nickname.trim().split(/\s+/)[0]
      : null

  const subject = firstName
    ? `${firstName}, vi sparade din provning`
    : `Spara din vinprovning från ${input.courseTitle}`

  const greeting = firstName ? `Hej ${firstName}!` : 'Hej!'

  const text = [
    greeting,
    '',
    `Tack för att du var med på ${input.courseTitle}.`,
    '',
    'Skapa ett konto så sparar vi alla dina recensioner och provningsanteckningar — och du kan komma tillbaka och se dem när som helst.',
    '',
    '· Alla dina vinrecensioner samlas på Mina sidor',
    '· Få förslag på liknande viner du kommer att gilla',
    '· Bjud in till dina egna grupprovningar',
    '',
    'Spara din provning:',
    input.claimUrl,
    '',
    'Det tar 30 sekunder. Avsluta när du vill.',
    '',
    'Skål!',
    'Vinakademin-teamet',
  ].join('\n')

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
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

          <tr>
            <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
              <div style="font-size: 12px; color: #ffffff; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;">
                Spara din provning
              </div>
              <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15;">
                Vinakademin
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 8px;">
              <h2 style="margin: 0 0 12px; color: #1a1714; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.25;">
                ${escapeHtml(greeting)}
              </h2>
              <p style="margin: 0 0 16px; color: #1a1714; font-size: 16px; line-height: 1.55;">
                Tack för att du var med på <strong>${escapeHtml(input.courseTitle)}</strong>.
              </p>
              <p style="margin: 0 0 16px; color: #4a4540; font-size: 15px; line-height: 1.55;">
                Skapa ett konto så sparar vi alla dina recensioner och provningsanteckningar — och du kan komma tillbaka och se dem när som helst.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 8px;">
              <ul style="margin: 0; padding-left: 18px; color: #4a4540; font-size: 15px; line-height: 1.7;">
                <li>Alla dina vinrecensioner samlas på Mina sidor</li>
                <li>Få förslag på liknande viner du kommer att gilla</li>
                <li>Bjud in till dina egna grupprovningar</li>
              </ul>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 24px 32px 8px;">
              ${emailPrimaryCtaButton(input.claimUrl, 'Spara din provning →')}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 8px 32px 32px;">
              <p style="margin: 0; color: #8a8580; font-size: 12px; line-height: 1.5;">
                Det tar 30 sekunder. Avsluta när du vill.
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 16px 32px 32px; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #8a8580; font-size: 12px; line-height: 1.5;">
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
