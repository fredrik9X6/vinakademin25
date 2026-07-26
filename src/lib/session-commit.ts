export type CommitPartResult = 'ok' | 'skipped' | 'failed'

export interface CommitParts {
  guess: CommitPartResult
  review: CommitPartResult
}

/**
 * Collapse the per-part outcomes into one user-facing verdict.
 *
 * A partial failure must never read as success: the participant pressed one
 * button and is entitled to one honest answer about whether their work is
 * safe. "skipped" means the client sent nothing for that part, which is not a
 * failure.
 */
export function summariseCommit(parts: CommitParts): { ok: boolean; message: string } {
  const guessFailed = parts.guess === 'failed'
  const reviewFailed = parts.review === 'failed'
  if (guessFailed && reviewFailed) return { ok: false, message: 'Inget kunde sparas' }
  if (guessFailed) return { ok: false, message: 'Gissningen kunde inte sparas' }
  if (reviewFailed) return { ok: false, message: 'Smaknoteringen kunde inte sparas' }
  return { ok: true, message: 'Sparat' }
}
