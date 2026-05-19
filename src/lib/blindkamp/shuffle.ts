import crypto from 'crypto'

/**
 * Cryptographically-shuffled 1..N pour-order assignments.
 * Returns a parallel array — `result[i]` is the pour order to assign to
 * `submissions[i]`. Used both as the host's pour order and as the
 * submitter's private "secret slot" in the ritual.
 */
export function assignPourOrders<T>(submissions: T[]): number[] {
  const n = submissions.length
  const slots = Array.from({ length: n }, (_, i) => i + 1)
  // Fisher-Yates with crypto randomness
  for (let i = n - 1; i > 0; i--) {
    const r = crypto.randomBytes(4).readUInt32BE(0) % (i + 1)
    ;[slots[i], slots[r]] = [slots[r]!, slots[i]!]
  }
  return slots
}
