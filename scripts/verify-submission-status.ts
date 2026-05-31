/**
 * TDD verification script for classifySubmissions.
 *
 * Run with: npx tsx scripts/verify-submission-status.ts
 *
 * Tests (fail → pass after implementation):
 *  1. A participant with a draft guess (content, no submittedAt) → withContent only.
 *  2. A participant with a locked guess (submittedAt set) → withContent AND locked.
 *  3. A participant with a locked review (mapped via resolvePourForReview) → both lists.
 *  4. Multiple participants across multiple pours.
 *  5. A participant whose review has no wine identifier → not classified.
 *  6. No content leak — function signature never returns guess/review fields.
 */

import { classifySubmissions } from '../src/lib/session-submission-status'
import { buildPourMaps } from '../src/lib/session-pour-mapping'

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${label}`)
    failed++
  }
}

function assertDeepEqual(a: unknown, b: unknown, label: string) {
  const as = JSON.stringify(a)
  const bs = JSON.stringify(b)
  if (as === bs) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${label}`)
    console.error(`    expected: ${bs}`)
    console.error(`    got:      ${as}`)
    failed++
  }
}

// ─── Fixtures ──────────────────────────────────────────────────────────────
// Two wines: pourOrder 1 = library wine id 10, pourOrder 2 = custom wine "Château Test"

const wines = [
  { pourOrder: 1, libraryWine: { id: 10 } },
  { pourOrder: 2, customWine: { name: 'Château Test', systembolagetProductNumber: null } },
]
const pourMaps = buildPourMaps(wines)

// ─── Test 1: Draft guess → withContent only, not locked ────────────────────
console.log('\nTest 1: Draft guess (content, no submittedAt)')
{
  const guesses = [
    {
      sessionParticipant: 7,
      pourOrder: 1,
      guessedCountry: 'France',
      guessedGrape: null,
      guessedPriceBucket: null,
      submittedAt: null,
    },
  ]
  const reviews: unknown[] = []
  const result = classifySubmissions(guesses, reviews, pourMaps)

  assert(result[1] !== undefined, 'pour 1 exists in result')
  assert(result[1]?.withContent.includes(7), 'participant 7 in withContent for pour 1')
  assert(!result[1]?.locked.includes(7), 'participant 7 NOT in locked for pour 1')
}

// ─── Test 2: Locked guess → in both lists ──────────────────────────────────
console.log('\nTest 2: Locked guess (submittedAt set)')
{
  const guesses = [
    {
      sessionParticipant: 8,
      pourOrder: 1,
      guessedCountry: 'Italy',
      guessedGrape: 'Sangiovese',
      guessedPriceBucket: '100_149',
      submittedAt: '2025-01-01T12:00:00.000Z',
    },
  ]
  const reviews: unknown[] = []
  const result = classifySubmissions(guesses, reviews, pourMaps)

  assert(result[1]?.withContent.includes(8), 'participant 8 in withContent for pour 1')
  assert(result[1]?.locked.includes(8), 'participant 8 in locked for pour 1')
}

// ─── Test 3: Locked review mapped via resolvePourForReview ─────────────────
console.log('\nTest 3: Locked review (library wine, submittedAt set)')
{
  const guesses: unknown[] = []
  const reviews = [
    {
      sessionParticipant: 9,
      wine: 10, // matches libraryWine id 10 → pourOrder 1
      customWine: null,
      rating: 4,
      submittedAt: '2025-01-01T13:00:00.000Z',
    },
  ]
  const result = classifySubmissions(guesses, reviews, pourMaps)

  assert(result[1]?.withContent.includes(9), 'participant 9 in withContent for pour 1 (review)')
  assert(result[1]?.locked.includes(9), 'participant 9 in locked for pour 1 (review)')
}

// ─── Test 4: Multiple participants, multiple pours ─────────────────────────
console.log('\nTest 4: Multiple participants across multiple pours')
{
  const guesses = [
    // Pour 1: participant 11 = draft, participant 12 = locked
    {
      sessionParticipant: 11,
      pourOrder: 1,
      guessedCountry: 'Spain',
      guessedGrape: null,
      guessedPriceBucket: null,
      submittedAt: null,
    },
    {
      sessionParticipant: 12,
      pourOrder: 1,
      guessedCountry: 'Germany',
      guessedGrape: 'Riesling',
      guessedPriceBucket: null,
      submittedAt: '2025-01-02T10:00:00.000Z',
    },
    // Pour 2: participant 13 = draft (custom wine review)
  ]
  const reviews = [
    {
      sessionParticipant: 13,
      wine: null,
      customWine: { name: 'Château Test', systembolagetProductNumber: null },
      rating: 3,
      submittedAt: null,
    },
  ]
  const result = classifySubmissions(guesses, reviews, pourMaps)

  assert(result[1]?.withContent.includes(11), 'p11 withContent pour1')
  assert(!result[1]?.locked.includes(11), 'p11 NOT locked pour1')
  assert(result[1]?.withContent.includes(12), 'p12 withContent pour1')
  assert(result[1]?.locked.includes(12), 'p12 locked pour1')
  assert(result[2]?.withContent.includes(13), 'p13 withContent pour2 (custom wine review)')
  assert(!result[2]?.locked.includes(13), 'p13 NOT locked pour2')
}

// ─── Test 5: Review with no wine identifier → not classified ───────────────
console.log('\nTest 5: Review with no usable wine identifier → not classified')
{
  const guesses: unknown[] = []
  const reviews = [
    {
      sessionParticipant: 14,
      wine: null,
      customWine: null,
      rating: 2,
      submittedAt: null,
    },
  ]
  const result = classifySubmissions(guesses, reviews, pourMaps)
  const allWithContent = Object.values(result).flatMap((e) => e.withContent)
  assert(!allWithContent.includes(14), 'p14 not in any withContent (unresolvable review)')
}

// ─── Test 6: No content fields in return value ─────────────────────────────
console.log('\nTest 6: Return value contains only ids + status (no content)')
{
  const guesses = [
    {
      sessionParticipant: 20,
      pourOrder: 1,
      guessedCountry: 'Portugal',
      guessedGrape: 'Touriga',
      guessedPriceBucket: '200_249',
      submittedAt: '2025-06-01T00:00:00.000Z',
    },
  ]
  const reviews: unknown[] = []
  const result = classifySubmissions(guesses, reviews, pourMaps)
  const entry = result[1]
  assert(entry !== undefined, 'entry exists')
  const keys = Object.keys(entry ?? {})
  assertDeepEqual(keys.sort(), ['locked', 'withContent'], 'entry has exactly withContent + locked keys')
}

// ─── Test 7: Guess with NO content fields → not in withContent ─────────────
console.log('\nTest 7: Guess row with all-null content → NOT in withContent')
{
  const guesses = [
    {
      sessionParticipant: 30,
      pourOrder: 1,
      guessedCountry: null,
      guessedGrape: null,
      guessedPriceBucket: null,
      submittedAt: null,
    },
  ]
  const reviews: unknown[] = []
  const result = classifySubmissions(guesses, reviews, pourMaps)
  const allWithContent = Object.values(result).flatMap((e) => e.withContent)
  assert(!allWithContent.includes(30), 'p30 NOT in withContent (empty guess row)')
}

// ─── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
