/** How long after the last interaction the view stops auto-following the host. */
export const FOLLOW_IDLE_MS = 10_000

/**
 * Decide whether the view may auto-advance to the host's wine.
 *
 * Moving the screen out from under someone mid-sentence is worse than letting
 * them fall a wine behind, so this fails safe: at exactly the idle boundary we
 * do NOT follow.
 */
export function shouldFollowHost(
  lastInteractionAt: number | null,
  now: number,
): boolean {
  if (lastInteractionAt === null) return true
  return now - lastInteractionAt > FOLLOW_IDLE_MS
}
