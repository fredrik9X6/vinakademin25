/**
 * Pure helper for classifying blind-tasting submission status per pour.
 *
 * This module is deliberately DB-free and React-free — it operates only on
 * plain data already fetched by the caller. It is used by the SSE stream route
 * to emit the `submissions` event which tells the host, per wine (pour order),
 * which participants have entered something and which have locked in.
 *
 * PRIVACY CONTRACT:
 *  - The return value NEVER includes guess or review content (no guessedCountry,
 *    guessedGrape, rating, tasting notes, etc.) — only participant ids and their
 *    submission status. Blind tasting secrecy must be preserved until reveal.
 */

import { buildPourMaps, resolvePourForReview, PourMaps } from './session-pour-mapping'

export interface SubmissionStatusEntry {
  /** SessionParticipant ids that have ANY content for this pour (draft or locked). */
  withContent: number[]
  /** SessionParticipant ids whose row has `submittedAt` set (locked in). */
  locked: number[]
}

/** Map from pourOrder → status entry. Only pours with at least one submission appear. */
export type SubmissionsByPour = Record<number, SubmissionStatusEntry>

// ── Internal shape of a SessionGuess row as fetched by the stream route ────
interface RawGuess {
  sessionParticipant?: number | { id: number } | null
  pourOrder: number
  guessedCountry?: string | null
  guessedGrape?: string | null
  guessedPriceBucket?: string | null
  submittedAt?: string | null
}

// ── Internal shape of a Review row as fetched by the stream route ──────────
interface RawReview {
  sessionParticipant?: number | { id: number } | null
  wine?: number | { id: number } | null
  customWine?: {
    name?: string | null
    systembolagetProductNumber?: string | null
  } | null
  // rating is required in Reviews but we keep it optional here so the helper
  // works even if the query omits it — we derive "has content" from the
  // mere existence of a matchable review row with a valid participant.
  rating?: number | null
  submittedAt?: string | null
}

function resolveParticipantId(raw: number | { id: number } | null | undefined): number | null {
  if (raw == null) return null
  if (typeof raw === 'object') return (raw as { id: number }).id
  return raw
}

/** Returns true when a guess row contains at least one content field. */
function guessHasContent(g: RawGuess): boolean {
  return (
    (typeof g.guessedCountry === 'string' && g.guessedCountry.trim() !== '') ||
    (typeof g.guessedGrape === 'string' && g.guessedGrape.trim() !== '') ||
    (typeof g.guessedPriceBucket === 'string' && g.guessedPriceBucket.trim() !== '')
  )
}

/**
 * Classify all session guesses and reviews into a per-pour status map.
 *
 * @param guesses  Raw SessionGuess rows for the session (depth: 0).
 * @param reviews  Raw Review rows for the session (depth: 0).
 * @param pourMaps Pour maps built by `buildPourMaps` from the session's tasting plan wines.
 * @returns        Map of pourOrder → { withContent: participantId[], locked: participantId[] }.
 *                 Content fields are NEVER included — only participant ids and status.
 */
export function classifySubmissions(
  guesses: unknown[],
  reviews: unknown[],
  pourMaps: PourMaps,
): SubmissionsByPour {
  const result: SubmissionsByPour = {}

  const getEntry = (pour: number): SubmissionStatusEntry => {
    if (!result[pour]) result[pour] = { withContent: [], locked: [] }
    return result[pour]!
  }

  // ── Process guesses (pourOrder is stored directly on the row) ─────────────
  for (const raw of guesses) {
    const g = raw as RawGuess
    const participantId = resolveParticipantId(g.sessionParticipant)
    if (participantId == null) continue
    if (typeof g.pourOrder !== 'number' || g.pourOrder < 1) continue

    const hasContent = guessHasContent(g)
    const isLocked = typeof g.submittedAt === 'string' && g.submittedAt.trim() !== ''

    if (!hasContent && !isLocked) continue // empty draft row — skip

    const entry = getEntry(g.pourOrder)
    if (hasContent && !entry.withContent.includes(participantId)) {
      entry.withContent.push(participantId)
    }
    if (isLocked && !entry.locked.includes(participantId)) {
      entry.locked.push(participantId)
    }
  }

  // ── Process reviews (wine identity → pour via resolvePourForReview) ────────
  for (const raw of reviews) {
    const r = raw as RawReview
    const participantId = resolveParticipantId(r.sessionParticipant)
    if (participantId == null) continue

    const pour = resolvePourForReview(r, pourMaps)
    if (pour == null) continue // review not mappable to a pour in this plan

    // A review row's very existence (with a resolvable pour) indicates content.
    // We treat any review — even a bare rating-only one — as "with content"
    // because the Reviews collection requires a rating to save the row.
    const isLocked = typeof r.submittedAt === 'string' && r.submittedAt.trim() !== ''

    const entry = getEntry(pour)
    if (!entry.withContent.includes(participantId)) {
      entry.withContent.push(participantId)
    }
    if (isLocked && !entry.locked.includes(participantId)) {
      entry.locked.push(participantId)
    }
  }

  return result
}

// Re-export buildPourMaps so callers can do a single import when they need both.
export { buildPourMaps }
