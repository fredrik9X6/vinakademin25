import crypto from 'crypto'

const SECRET = process.env.PAYLOAD_SECRET || 'dev-fallback-secret'

/** Stable opaque token for a submission. Not reversible — encoded as base64url HMAC. */
export function generateSubmissionToken(battleId: number, key: string): string {
  const payload = `${battleId}:${key}:${crypto.randomBytes(8).toString('hex')}`
  const h = crypto.createHmac('sha256', SECRET).update(payload).digest()
  return Buffer.concat([Buffer.from(payload), h])
    .toString('base64url')
    .slice(0, 48)
}

/** Constant-time compare for submission tokens. */
export function verifySubmissionToken(stored: string, incoming: string): boolean {
  const a = Buffer.from(stored)
  const b = Buffer.from(incoming)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}
