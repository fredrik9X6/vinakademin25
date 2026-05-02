export type Body = 'light' | 'bold'
export type Comfort = 'classic' | 'adventurous'
export type QuadrantKey =
  | 'light-classic'
  | 'light-adventurous'
  | 'bold-classic'
  | 'bold-adventurous'

export interface AnswerInput {
  /** Payload id of the VinkompassQuestion */
  questionId: number
  /** 0..3 — the chosen answer index in the question's answers array */
  answerIndex: number
}

export interface ScoreResult {
  scoreBody: number
  scoreComfort: number
  body: Body
  comfort: Comfort
  quadrant: QuadrantKey
}
