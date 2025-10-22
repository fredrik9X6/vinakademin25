const resolveSiteURL = () => {
  const baseURL =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PAYLOAD_PUBLIC_SITE_URL ||
    process.env.PAYLOAD_PUBLIC_SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.vinakademin.se'
      : 'http://localhost:3000')

  return typeof baseURL === 'string' ? baseURL.replace(/\/$/, '') : ''
}

/**
 * Returns the public site URL used for links in emails, redirects, etc.
 * Falls back to sensible defaults when env vars are missing.
 */
export const getSiteURL = () => resolveSiteURL()

