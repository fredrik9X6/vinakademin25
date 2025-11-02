import { getSiteURL } from './site-url'

const SITE_URL = getSiteURL()

interface ReceiptEmailData {
  firstName?: string
  courseTitle: string
  courseSlug: string
  orderId: string
  amount: number
  paidAt: string
  receiptUrl?: string | null
}

export function generateReceiptEmailHTML({
  firstName,
  courseTitle,
  courseSlug,
  orderId,
  amount,
  paidAt,
  receiptUrl,
}: ReceiptEmailData): string {
  const formattedAmount = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
  }).format(amount)

  const formattedDate = new Date(paidAt).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const courseUrl = `${SITE_URL}/vinprovningar/${courseSlug}`

  return `
    <!DOCTYPE html>
    <html lang="sv">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kvitto - ${courseTitle} - Vinakademin</title>
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
                <td align="center" style="padding: 48px 40px 32px; background: linear-gradient(135deg, #FDBA75 0%, #FB914C 100%); border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                    🍷 Vinakademin
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 40px 32px;">
                  <h2 style="margin: 0 0 16px; color: #18181b; font-size: 24px; font-weight: 600; line-height: 1.3;">
                    Tack för ditt köp! 🎉
                  </h2>
                  
                  <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                    Hej${firstName ? ` ${firstName}` : ''},
                  </p>
                  
                  <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                    Ditt köp är genomfört och du har nu tillgång till <strong>${courseTitle}</strong>. Perfekt val! 🍇
                  </p>

                  <!-- Receipt Details -->
                  <div style="padding: 24px; background-color: #fafafa; border-radius: 8px; margin-bottom: 32px; border: 1px solid #e5e5e5;">
                    <h3 style="margin: 0 0 20px; color: #18181b; font-size: 18px; font-weight: 600;">
                      Köpinformation
                    </h3>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e5e5e5;">
                          Produkt:
                        </td>
                        <td align="right" style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; border-bottom: 1px solid #e5e5e5;">
                          ${courseTitle}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e5e5e5;">
                          Belopp:
                        </td>
                        <td align="right" style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; border-bottom: 1px solid #e5e5e5;">
                          ${formattedAmount}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #71717a; font-size: 14px; border-bottom: 1px solid #e5e5e5;">
                          Datum:
                        </td>
                        <td align="right" style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500; border-bottom: 1px solid #e5e5e5;">
                          ${formattedDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #71717a; font-size: 14px;">
                          Ordernummer:
                        </td>
                        <td align="right" style="padding: 8px 0; color: #18181b; font-size: 14px; font-weight: 500;">
                          #${orderId}
                        </td>
                      </tr>
                    </table>
                  </div>

                  ${receiptUrl ? `
                    <!-- Receipt Link -->
                    <p style="margin: 0 0 24px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                      Du kan hitta ditt kvitto från Stripe genom att klicka på länken nedan:
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 0 0 32px;">
                          <a href="${receiptUrl}" style="display: inline-block; padding: 12px 32px; background-color: #fafafa; color: #FB914C; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; border: 1px solid #e5e5e5;">
                            Visa kvitto från Stripe
                          </a>
                        </td>
                      </tr>
                    </table>
                  ` : ''}

                  <!-- CTA Button -->
                  <p style="margin: 0 0 32px; color: #3f3f46; font-size: 16px; line-height: 1.6;">
                    Nu är det dags att börja lära dig om vin! 🍷
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td align="center" style="padding: 0 0 32px;">
                        <a href="${courseUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #FDBA75 0%, #FB914C 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(251, 145, 76, 0.3);">
                          Börja kursen nu
                        </a>
                      </td>
                    </tr>
                  </table>

                  <!-- What's Next -->
                  <div style="padding: 24px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 8px; margin-bottom: 32px;">
                    <h3 style="margin: 0 0 16px; color: #FB914C; font-size: 18px; font-weight: 600;">
                      Vad händer nu?
                    </h3>
                    <ul style="margin: 0; padding-left: 20px; color: #3f3f46; font-size: 14px; line-height: 1.8;">
                      <li>Du har nu tillgång till hela kursen</li>
                      <li>Gå igenom modulerna i din egen takt</li>
                      <li>Titta på videor, läs material och gör quiz</li>
                      <li>Bli mer självsäker i din kunskap om vin</li>
                    </ul>
                  </div>

                  <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                    Om du har några frågor eller behöver hjälp, hör av dig till oss på <a href="mailto:hej@vinakademin.se" style="color: #FB914C; text-decoration: none;">hej@vinakademin.se</a>. Vi är här för att hjälpa dig! 💪
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 32px 40px; border-top: 1px solid #e5e5e5;">
                  <p style="margin: 0 0 12px; color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
                    Lycka till med din vinresa!<br>
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
}

