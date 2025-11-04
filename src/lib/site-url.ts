const defaultURL =
  process.env.NODE_ENV === 'production' ? 'https://www.vinakademin.se' : 'http://localhost:3000'

const appendSchemeIfMissing = (url: string) => {
  if (/^https?:\/\//i.test(url)) return url
  const trimmed = url.trim()
  if (!trimmed) return defaultURL
  const useHttp =
    trimmed.startsWith('localhost') ||
    trimmed.startsWith('127.') ||
    trimmed.startsWith('::1') ||
    trimmed.startsWith('0.0.0.0')
  return `${useHttp ? 'http' : 'https'}://${trimmed}`
}

const normalizeURL = (rawUrl: string | undefined | null) => {
  if (!rawUrl) return defaultURL
  const withScheme = appendSchemeIfMissing(rawUrl)
  try {
    const parsed = new URL(withScheme)
    return parsed.origin
  } catch {
    return defaultURL
  }
}

const resolveSiteURL = () =>
  normalizeURL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.PAYLOAD_PUBLIC_SITE_URL ||
      process.env.PAYLOAD_PUBLIC_SERVER_URL ||
      process.env.NEXT_PUBLIC_SERVER_URL,
  )

/**
 * Returns the public site URL used for links in emails, redirects, etc.
 * Falls back to sensible defaults when env vars are missing.
 */
export const getSiteURL = () => resolveSiteURL()

/**
 * Returns the cookie domain configuration for authentication cookies.
 * In production, uses COOKIE_DOMAIN env var or falls back to domain extraction from SITE_URL.
 * In development, uses 'localhost'.
 * Returns undefined if domain should be omitted (letting browser handle it automatically).
 *
 * Staging (Railway): Omits domain (works better with Railway's subdomain structure)
 * Production (www.vinakademin.se): Omits domain by default, or uses COOKIE_DOMAIN if set
 */
export const getCookieDomain = (): string | undefined => {
  if (process.env.NODE_ENV !== 'production') {
    return 'localhost'
  }

  // Allow explicit cookie domain override via environment variable
  // Example: COOKIE_DOMAIN=.vinakademin.se (for cross-subdomain cookies)
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN
  }

  // Extract domain from SITE_URL if available
  const siteURL = resolveSiteURL()
  try {
    const url = new URL(siteURL)
    const hostname = url.hostname

    // If it's a localhost or IP, return undefined (let browser handle it)
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^[0-9.]+$/.test(hostname)
    ) {
      return undefined
    }

    // For Railway staging domains (e.g., vinakademin25-production.up.railway.app),
    // omit domain to let browser handle it automatically
    if (hostname.includes('.railway.app') || hostname.includes('.up.railway.app')) {
      return undefined
    }

    // For production domains (www.vinakademin.se), omit domain by default
    // This works better with Cloudflare and other proxies
    // If you need cross-subdomain cookies (e.g., www.vinakademin.se + app.vinakademin.se),
    // set COOKIE_DOMAIN=.vinakademin.se explicitly
    return undefined
  } catch {
    return undefined
  }
}
