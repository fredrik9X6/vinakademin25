/**
 * Outlook (Word HTML engine) ignores linear-gradient and often strips background on
 * anchor-based “buttons”, leaving white boxes with white text. Use table cells with
 * bgcolor + solid CSS fallbacks, and VML roundrects for Outlook desktop.
 */
const PRIMARY = '#FB914C'
const PRIMARY_LIGHT = '#FDBA75'

/** Primary brand CTA — orange, white label */
export function emailPrimaryCtaButton(href: string, label: string): string {
  return `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:52px;v-text-anchor:middle;width:320px;" arcsize="12%" stroke="f" fillcolor="${PRIMARY}">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;mso-line-height-rule:exactly;line-height:20px;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td align="center" bgcolor="${PRIMARY}" style="border-radius:8px;background-color:${PRIMARY};background-image:linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, ${PRIMARY} 100%);">
      <a href="${href}" target="_blank" style="display:inline-block;padding:16px 40px;color:#ffffff !important;text-decoration:none !important;border-radius:8px;font-size:16px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:20px;mso-line-height-rule:exactly;">
        ${label}
      </a>
    </td>
  </tr>
</table>
<!--<![endif]-->
`
}

/** Light grey outline button (e.g. Stripe receipt link) */
export function emailLightOutlineButton(href: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td align="center" bgcolor="#fafafa" style="border-radius:8px;background-color:#fafafa;border:1px solid #e5e5e5;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 32px;color:${PRIMARY} !important;text-decoration:none !important;border-radius:8px;font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:20px;mso-line-height-rule:exactly;">
        ${label}
      </a>
    </td>
  </tr>
</table>
`
}

/** Dark solid button (e.g. guest “Aktivera konto”) */
export function emailDarkSolidButton(href: string, label: string): string {
  const dark = '#18181b'
  return `
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="14%" stroke="f" fillcolor="${dark}">
  <w:anchorlock/>
  <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;mso-line-height-rule:exactly;line-height:20px;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td align="center" bgcolor="${dark}" style="border-radius:8px;background-color:${dark};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 32px;color:#ffffff !important;text-decoration:none !important;border-radius:8px;font-size:14px;font-weight:600;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;line-height:20px;mso-line-height-rule:exactly;">
        ${label}
      </a>
    </td>
  </tr>
</table>
<!--<![endif]-->
`
}

/** Header strip: solid fallback + gradient for modern clients */
export function emailHeaderCellStyle(): string {
  return `padding: 48px 40px 32px; background-color: ${PRIMARY}; background-image: linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, ${PRIMARY} 100%); border-radius: 12px 12px 0 0;`
}

/** Warm callout box — solid fallback for Outlook */
export function emailWarmCalloutStyle(): string {
  return `padding: 24px; background-color: #ffedd5; background-image: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 8px; margin-bottom: 32px;`
}

export const emailBrandOrange = PRIMARY

/**
 * Escapes a string for safe interpolation into HTML email bodies.
 * Use for any value that originates from user, admin, or DB content.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
