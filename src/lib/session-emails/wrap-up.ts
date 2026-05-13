import {
  emailBrandOrange,
  emailHeaderCellStyle,
  emailPrimaryCtaButton,
  escapeHtml,
} from '../email-cta'
import { getSiteURL } from '../site-url'

export interface WrapUpWine {
  /** Pour order in the session (1-based). */
  pourOrder: number
  /** Library wine slug — used to build /vinlistan/<slug> link. Null for custom wines. */
  slug: string | null
  /** Display title. */
  title: string
  /** Subtitle line: producer · vintage · region (library) or producer · vintage (custom). */
  subtitle: string
}

export interface WrapUpUserReview {
  pourOrder: number
  rating: number | null
  notesExcerpt: string | null
  buyAgain: 'yes' | 'maybe' | 'no' | null
}

export interface WrapUpGroupRow {
  pourOrder: number
  title: string
  avgRating: number
  reviewerCount: number
}

export interface WrapUpRecommendation {
  slug: string
  title: string
  subtitle: string
  thumbnailUrl: string | null
}

export interface WrapUpEmailInput {
  /** Recipient's nickname for personalized greeting. */
  nickname: string | null
  /** Session/plan/course display title for the subject + header. */
  title: string
  /** Occasion line if set on the plan; else null. */
  occasion: string | null
  /** Locale-formatted date the session happened. */
  dateText: string
  /** True when the recipient is unauthenticated (guest). Drives CTA copy. */
  isGuest: boolean
  /** Wines in pour order. */
  wines: WrapUpWine[]
  /** The recipient's reviews; subset of wines. */
  userReviews: WrapUpUserReview[]
  /** Group comparison rows; null when fewer than 2 participants reviewed. */
  groupComparison: { rows: WrapUpGroupRow[]; favoriteTitle: string | null } | null
  /** Recommendation picks; null when fewer than 3 hits. */
  recommendations: WrapUpRecommendation[] | null
  /** Primary CTA URL. /registrera?... for guests, /vinlistan for authed. */
  ctaUrl: string
  /** Primary CTA label. */
  ctaLabel: string
}

function renderStars(rating: number | null): string {
  if (rating == null) return '—'
  const full = Math.max(0, Math.min(5, Math.round(rating)))
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

function buyAgainChip(value: WrapUpUserReview['buyAgain']): string {
  if (value === 'yes') return 'Skulle köpa igen'
  if (value === 'maybe') return 'Kanske'
  if (value === 'no') return 'Nej'
  return ''
}

export function buildWrapUpEmail(input: WrapUpEmailInput): {
  subject: string
  html: string
  text: string
} {
  const siteUrl = getSiteURL()
  const firstName = input.nickname?.trim().split(/\s+/)[0] ?? null
  const greeting = firstName ? `Hej ${firstName}!` : 'Hej!'

  const subject = `Tack för att du var med — så gick din provning av "${input.title}"`

  const coverageNote =
    input.userReviews.length < input.wines.length
      ? `Du hann inte betygsätta alla viner — kolla in resten på Vinlistan.`
      : null

  // ---- Plain-text variant ----
  const textLines: string[] = []
  textLines.push(greeting, '')
  textLines.push(`Tack för att du var med på "${input.title}".`)
  if (input.occasion) textLines.push(`Tillfälle: ${input.occasion}`)
  textLines.push(`Datum: ${input.dateText}`, '')

  textLines.push('Dina betyg:')
  for (const r of input.userReviews) {
    const wine = input.wines.find((w) => w.pourOrder === r.pourOrder)
    if (!wine) continue
    const chip = buyAgainChip(r.buyAgain)
    textLines.push(
      `${r.pourOrder}. ${wine.title} — ${renderStars(r.rating)}${chip ? ` · ${chip}` : ''}`,
    )
    if (r.notesExcerpt) textLines.push(`   "${r.notesExcerpt}"`)
  }
  if (coverageNote) textLines.push('', coverageNote)

  if (input.groupComparison) {
    textLines.push('', 'Så tyckte gruppen:')
    for (const g of input.groupComparison.rows) {
      textLines.push(
        `${g.pourOrder}. ${g.title} — snitt ${g.avgRating.toFixed(1)} (${g.reviewerCount} recensioner)`,
      )
    }
    if (input.groupComparison.favoriteTitle) {
      textLines.push('', `Veckans favorit: ${input.groupComparison.favoriteTitle}`)
    }
  }

  if (input.recommendations) {
    textLines.push('', 'Vinakademins rekommendationer:')
    for (const rec of input.recommendations) {
      textLines.push(`- ${rec.title} — ${rec.subtitle}`)
    }
  }

  textLines.push('', `${input.ctaLabel}: ${input.ctaUrl}`, '', 'Skål!', 'Vinakademin-teamet')
  const text = textLines.join('\n')

  // ---- HTML variant ----
  const userReviewsHtml = input.userReviews
    .map((r) => {
      const wine = input.wines.find((w) => w.pourOrder === r.pourOrder)
      if (!wine) return ''
      const linked = wine.slug
        ? `<a href="${siteUrl}/vinlistan/${escapeHtml(wine.slug)}" style="color: ${emailBrandOrange}; text-decoration: none;">${escapeHtml(wine.title)}</a>`
        : escapeHtml(wine.title)
      const chip = buyAgainChip(r.buyAgain)
      const chipHtml = chip
        ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 999px; background: rgba(253,186,117,0.18); color: ${emailBrandOrange}; font-size: 11px; font-weight: 600;">${escapeHtml(chip)}</span>`
        : ''
      const notesHtml = r.notesExcerpt
        ? `<p style="margin: 4px 0 0; color: #4a4540; font-size: 14px; line-height: 1.5; font-style: italic;">"${escapeHtml(r.notesExcerpt)}"</p>`
        : ''
      return `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
              <strong style="color: #8a8580; font-size: 13px; min-width: 18px;">#${r.pourOrder}</strong>
              <span style="color: #1a1714; font-size: 15px; font-weight: 600;">${linked}</span>
              <span style="color: ${emailBrandOrange}; font-size: 14px; letter-spacing: 1px;">${renderStars(r.rating)}</span>
              ${chipHtml}
            </div>
            ${notesHtml}
          </td>
        </tr>`
    })
    .join('')

  const coverageHtml = coverageNote
    ? `<tr><td style="padding: 12px 0 0;"><p style="margin: 0; color: #8a8580; font-size: 13px; line-height: 1.5; font-style: italic;">${escapeHtml(coverageNote)}</p></td></tr>`
    : ''

  const groupHtml = input.groupComparison
    ? `
      <tr>
        <td style="padding: 24px 0 8px;">
          <h3 style="margin: 0 0 12px; color: #1a1714; font-size: 18px; font-weight: 600;">Så tyckte gruppen</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${input.groupComparison.rows
              .map(
                (g) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                  <div style="display: flex; align-items: baseline; gap: 8px;">
                    <strong style="color: #8a8580; font-size: 13px; min-width: 18px;">#${g.pourOrder}</strong>
                    <span style="color: #1a1714; font-size: 15px;">${escapeHtml(g.title)}</span>
                    <span style="margin-left: auto; color: ${emailBrandOrange}; font-size: 14px; font-weight: 600;">${g.avgRating.toFixed(1)} ★</span>
                    <span style="color: #8a8580; font-size: 12px;">(${g.reviewerCount})</span>
                  </div>
                </td>
              </tr>`,
              )
              .join('')}
          </table>
          ${
            input.groupComparison.favoriteTitle
              ? `<p style="margin: 12px 0 0; color: #1a1714; font-size: 14px;"><strong>Veckans favorit:</strong> ${escapeHtml(input.groupComparison.favoriteTitle)}</p>`
              : ''
          }
        </td>
      </tr>`
    : ''

  const recsHtml = input.recommendations
    ? `
      <tr>
        <td style="padding: 24px 0 8px;">
          <h3 style="margin: 0 0 12px; color: #1a1714; font-size: 18px; font-weight: 600;">Vinakademins rekommendationer</h3>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${input.recommendations
              .map(
                (rec) => `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
                  <a href="${siteUrl}/vinlistan/${escapeHtml(rec.slug)}" style="color: #1a1714; text-decoration: none; display: block;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      ${
                        rec.thumbnailUrl
                          ? `<img src="${escapeHtml(rec.thumbnailUrl)}" alt="" width="40" height="40" style="border-radius: 4px; object-fit: cover; flex-shrink: 0;" />`
                          : `<div style="width: 40px; height: 40px; border-radius: 4px; background: #eee; flex-shrink: 0;"></div>`
                      }
                      <div style="flex: 1; min-width: 0;">
                        <p style="margin: 0; color: #1a1714; font-size: 14px; font-weight: 600;">${escapeHtml(rec.title)}</p>
                        <p style="margin: 2px 0 0; color: #8a8580; font-size: 12px;">${escapeHtml(rec.subtitle)}</p>
                      </div>
                      <span style="color: ${emailBrandOrange}; font-size: 13px; font-weight: 600;">Utforska →</span>
                    </div>
                  </a>
                </td>
              </tr>`,
              )
              .join('')}
          </table>
        </td>
      </tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

          <tr>
            <td align="center" bgcolor="${emailBrandOrange}" style="${emailHeaderCellStyle()}">
              <div style="font-size: 12px; color: #ffffff; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.18em; font-weight: 600;">
                Provningens facit
              </div>
              <h1 style="margin: 8px 0 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px; line-height: 1.15;">
                Vinakademin
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 32px 0;">
              <h2 style="margin: 0 0 12px; color: #1a1714; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.25;">
                ${escapeHtml(greeting)}
              </h2>
              <p style="margin: 0 0 8px; color: #1a1714; font-size: 16px; line-height: 1.55;">
                Tack för att du var med på <strong>${escapeHtml(input.title)}</strong>.
              </p>
              <p style="margin: 0; color: #8a8580; font-size: 13px; line-height: 1.55;">
                ${input.occasion ? escapeHtml(input.occasion) + ' · ' : ''}${escapeHtml(input.dateText)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 32px 0;">
              <h3 style="margin: 0 0 8px; color: #1a1714; font-size: 18px; font-weight: 600;">Dina viner och dina betyg</h3>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${userReviewsHtml}
                ${coverageHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              ${groupHtml}
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px;">
              ${recsHtml}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 32px;">
              ${emailPrimaryCtaButton(input.ctaUrl, input.ctaLabel)}
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
