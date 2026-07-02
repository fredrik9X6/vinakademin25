import { redirect } from 'next/navigation'

/**
 * PAUSED (2026-07-02): subscriptions are on hold — there is nothing to manage
 * here. Restore this page (and its client components) from git history to
 * re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 */
export default function PrenumerationPage() {
  redirect('/profil')
}
