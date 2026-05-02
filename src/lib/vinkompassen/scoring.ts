import type { VinkompassQuestion } from '@/payload-types'
import type { AnswerInput, Body, Comfort, QuadrantKey, ScoreResult } from './types'

/**
 * Sum the body and comfort scores across the user's chosen answers.
 * Throws if any answer references an unknown question or an out-of-range index.
 *
 * Pure function — easy to unit-test and reuse from the API route.
 */
export function scoreAttempt(
  questions: Pick<VinkompassQuestion, 'id' | 'answers'>[],
  answers: AnswerInput[],
): ScoreResult {
  const byId = new Map(questions.map((q) => [q.id, q]))
  let scoreBody = 0
  let scoreComfort = 0

  for (const a of answers) {
    const q = byId.get(a.questionId)
    if (!q) throw new Error(`Unknown questionId: ${a.questionId}`)
    const opt = q.answers?.[a.answerIndex]
    if (!opt) throw new Error(`Invalid answerIndex ${a.answerIndex} for question ${a.questionId}`)
    scoreBody += opt.scoreBody
    scoreComfort += opt.scoreComfort
  }

  // Strict greater-than means score === 0 falls on the lighter / classic side
  // (per spec §4: "ties go to lighter / classic — safer landing for beginners").
  const body: Body = scoreBody > 0 ? 'bold' : 'light'
  const comfort: Comfort = scoreComfort > 0 ? 'adventurous' : 'classic'
  const quadrant = `${body}-${comfort}` as QuadrantKey

  return { scoreBody, scoreComfort, body, comfort, quadrant }
}
