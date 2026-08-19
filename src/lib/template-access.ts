/**
 * Who may see a tasting template's full contents.
 *
 * Since 2026-08-19 the whole tasting system is a free lead magnet: templates
 * are public to read, and the signup gate sits on the *actions* instead
 * (clone-from-template, the builder, hosting a session) — all of which were
 * already login-gated. `accessLevel` survives so an admin can still gate one
 * individual template behind a free account:
 *
 *   free = fully public, readable logged out
 *   paid = requires an account (which is free)
 *
 * Pure on purpose — the entitlement/subscription lookups that used to live
 * inline made this untestable. They are now dormant (see access-control.ts).
 *
 * Spec: docs/superpowers/specs/2026-08-19-lead-magnet-provningsverktyget-design.md (Section 1.1)
 */
export interface TemplateAccessInput {
  /** The viewer's role, if any. */
  role?: string | null
  /** The template's accessLevel field. */
  accessLevel?: string | null
  /** Whether a user is logged in at all. */
  isAuthenticated: boolean
}

export function resolveTemplateAccess({
  role,
  accessLevel,
  isAuthenticated,
}: TemplateAccessInput): boolean {
  if (role === 'admin') return true
  if (accessLevel === 'free') return true
  return isAuthenticated
}
