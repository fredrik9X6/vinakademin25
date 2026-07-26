import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  COUNTRY_POINTS,
  GRAPE_POINTS,
  PRICE_POINTS,
  TIER_POINTS,
  maxPointsForTiers,
  pointsLabel,
} from './blind-guess-scoring'

describe('TIER_POINTS', () => {
  it('mirrors the individual tier constants', () => {
    assert.equal(TIER_POINTS.country, COUNTRY_POINTS)
    assert.equal(TIER_POINTS.grape, GRAPE_POINTS)
    assert.equal(TIER_POINTS.price, PRICE_POINTS)
  })
})

describe('maxPointsForTiers', () => {
  it('sums all three enabled tiers', () => {
    assert.equal(
      maxPointsForTiers({ country: true, grape: true, price: true }),
      COUNTRY_POINTS + GRAPE_POINTS + PRICE_POINTS,
    )
  })

  it('counts only the enabled tiers', () => {
    assert.equal(
      maxPointsForTiers({ country: true, grape: false, price: true }),
      COUNTRY_POINTS + PRICE_POINTS,
    )
    assert.equal(
      maxPointsForTiers({ country: false, grape: true, price: false }),
      GRAPE_POINTS,
    )
  })

  it('is zero when no tier is enabled', () => {
    assert.equal(maxPointsForTiers({ country: false, grape: false, price: false }), 0)
  })
})

describe('pointsLabel', () => {
  // "poäng" is invariant in Swedish — identical singular and plural.
  it('uses the same word for one and many', () => {
    assert.equal(pointsLabel(1), '1 poäng')
    assert.equal(pointsLabel(3), '3 poäng')
  })

  it('renders zero without special-casing', () => {
    assert.equal(pointsLabel(0), '0 poäng')
  })
})
