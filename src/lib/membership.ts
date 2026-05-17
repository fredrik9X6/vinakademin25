import type { User } from '@/payload-types'

/**
 * Single source of truth for "does this viewer have full access to
 * members-only content".
 *
 * Admins always pass — they're the QA cohort and run the library. The
 * `subscriber` role is the long-term path (flipped by the Stripe webhook
 * in Chunk Q). `subscriptionStatus` is also honoured so admins can flip
 * the flag manually on test accounts during the bootstrap phase before
 * Chunk Q ships.
 */
export function viewerIsMember(user: User | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  if (user.role === 'subscriber') return true
  const status = (user as { subscriptionStatus?: string | null }).subscriptionStatus
  // Note: Users.subscriptionStatus uses 'free_trial' (Stripe maps 'trialing' → this value
  // in the webhook handler).
  return status === 'active' || status === 'free_trial'
}
