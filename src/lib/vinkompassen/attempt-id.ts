import { randomBytes } from 'node:crypto'

/**
 * Generates a 12-character URL-safe opaque token for shareable attempt URLs.
 * 9 random bytes → 12 base64url chars. ~72 bits of entropy is plenty for a
 * non-secret share link with no listing/enumeration endpoint.
 */
export function generateAttemptId(): string {
  return randomBytes(9).toString('base64url')
}
