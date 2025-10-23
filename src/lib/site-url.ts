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
