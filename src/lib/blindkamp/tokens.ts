import crypto from 'crypto'

/**
 * 43-character URL-safe random token. The token IS the credential — stored
 * as `submissionToken` on the row and compared verbatim on read. No HMAC
 * needed because we never need to verify provenance, only equality.
 *
 * (battleId and key params kept for API compatibility but unused in the new
 * format — the random bytes are entropy enough.)
 */
export function generateSubmissionToken(_battleId: number, _key: string): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Constant-time compare. */
export function verifySubmissionToken(stored: string, incoming: string): boolean {
  const a = Buffer.from(stored)
  const b = Buffer.from(incoming)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
