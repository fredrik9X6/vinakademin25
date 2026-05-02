import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scoreAttempt } from './scoring'
import type { VinkompassQuestion } from '@/payload-types'

const fixture = (id: number, scores: Array<[number, number]>): Pick<VinkompassQuestion, 'id' | 'answers'> => ({
  id,
  answers: scores.map(([scoreBody, scoreComfort], i) => ({
    label: `A${i}`,
    scoreBody,
    scoreComfort,
    id: String(i),
  })) as VinkompassQuestion['answers'],
})

describe('scoreAttempt', () => {
  it('sums scores across multiple questions', () => {
    const qs = [
      fixture(1, [[-2, -2], [0, 0], [1, 1], [2, 2]]),
      fixture(2, [[-1, -1], [0, 0], [1, 1], [2, 2]]),
    ]
    const r = scoreAttempt(qs, [
      { questionId: 1, answerIndex: 3 }, // (+2, +2)
      { questionId: 2, answerIndex: 2 }, // (+1, +1)
    ])
    assert.equal(r.scoreBody, 3)
    assert.equal(r.scoreComfort, 3)
    assert.equal(r.quadrant, 'bold-adventurous')
  })

  it('treats score=0 as the lighter/classic side (tie-break rule)', () => {
    const qs = [fixture(1, [[0, 0], [0, 0], [0, 0], [0, 0]])]
    const r = scoreAttempt(qs, [{ questionId: 1, answerIndex: 0 }])
    assert.equal(r.scoreBody, 0)
    assert.equal(r.scoreComfort, 0)
    assert.equal(r.body, 'light')
    assert.equal(r.comfort, 'classic')
    assert.equal(r.quadrant, 'light-classic')
  })

  it('produces the right quadrant for a clear lean', () => {
    const qs = [fixture(1, [[-2, -2], [-2, -2], [-2, -2], [-2, -2]])]
    const r = scoreAttempt(qs, [{ questionId: 1, answerIndex: 0 }])
    assert.equal(r.quadrant, 'light-classic')
  })

  it('throws on unknown questionId', () => {
    const qs = [fixture(1, [[0, 0], [0, 0], [0, 0], [0, 0]])]
    assert.throws(
      () => scoreAttempt(qs, [{ questionId: 999, answerIndex: 0 }]),
      /Unknown questionId: 999/,
    )
  })

  it('throws on invalid answerIndex', () => {
    const qs = [fixture(1, [[0, 0], [0, 0], [0, 0], [0, 0]])]
    assert.throws(
      () => scoreAttempt(qs, [{ questionId: 1, answerIndex: 7 }]),
      /Invalid answerIndex 7 for question 1/,
    )
  })
})
