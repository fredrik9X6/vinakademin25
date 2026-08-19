import { redirect } from 'next/navigation'

/**
 * PAUSED (2026-07-02): membership signup is on hold. Restore this page (and
 * BliMedlemForm) from git history to re-enable. See
 * docs/superpowers/specs/2026-07-02-pause-subscriptions-single-purchase-design.md
 *
 * Since 2026-08-19 tasting templates are a free lead magnet — no purchase or
 * membership required to use them. See
 * docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md
 */
export default function BliMedlemPage() {
  redirect('/provningsmallar')
}
