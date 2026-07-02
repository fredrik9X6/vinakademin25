import { redirect } from 'next/navigation'

/**
 * PAUSED (2026-07-02): membership signup is on hold — tasting templates are
 * sold as one-time purchases only. Restore this page (and BliMedlemForm) from
 * git history to re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 */
export default function BliMedlemPage() {
  redirect('/provningsmallar')
}
