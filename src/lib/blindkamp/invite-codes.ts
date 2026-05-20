import crypto from 'crypto'

// Omit ambiguous chars: 0/O/1/I/L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** 8-character URL-safe code. Collision probability negligible at our scale. */
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(8)
  let out = ''
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]
  }
  return out
}
