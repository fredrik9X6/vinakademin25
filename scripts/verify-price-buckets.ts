/**
 * Task 30 / Task 31 verification script.
 *
 * Asserts that:
 *   1. PRICE_BUCKETS has exactly 6 entries with the new values+labels.
 *   2. priceToBucket maps prices correctly to the new 6-bucket scheme.
 *
 * Run with:   npx tsx scripts/verify-price-buckets.ts
 * Expect FAIL before Task 31 (old 5-bucket scheme), PASS after.
 */

import { PRICE_BUCKETS, priceToBucket, type PriceBucket } from '../src/lib/blind-guess-vocab'

let passed = 0
let failed = 0

function assert(description: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`  ✓ ${description}`)
    passed++
  } else {
    console.error(`  ✗ ${description}`)
    console.error(`      expected: ${JSON.stringify(expected)}`)
    console.error(`      actual:   ${JSON.stringify(actual)}`)
    failed++
  }
}

// ── 1. PRICE_BUCKETS shape ────────────────────────────────────────────────────

console.log('\n── PRICE_BUCKETS (6 entries) ──')

const EXPECTED_BUCKETS: Array<{ value: PriceBucket; label: string }> = [
  { value: '0_99',    label: 'Under 100 kr' },
  { value: '100_149', label: '100–149 kr' },
  { value: '150_199', label: '150–199 kr' },
  { value: '200_249', label: '200–249 kr' },
  { value: '250_299', label: '250–299 kr' },
  { value: '300_plus', label: '300+ kr' },
]

assert('length === 6', PRICE_BUCKETS.length, 6)

for (const expected of EXPECTED_BUCKETS) {
  const found = PRICE_BUCKETS.find((b) => b.value === expected.value)
  assert(`value '${expected.value}' present`, found?.value, expected.value)
  assert(`label for '${expected.value}'`, found?.label, expected.label)
}

// ── 2. priceToBucket thresholds ───────────────────────────────────────────────

console.log('\n── priceToBucket thresholds ──')

const cases: Array<[number, PriceBucket]> = [
  [0,    '0_99'],
  [50,   '0_99'],
  [99,   '0_99'],
  [100,  '100_149'],
  [149,  '100_149'],
  [150,  '150_199'],
  [199,  '150_199'],
  [200,  '200_249'],
  [249,  '200_249'],
  [250,  '250_299'],
  [299,  '250_299'],
  [300,  '300_plus'],
  [9999, '300_plus'],
]

for (const [price, expected] of cases) {
  assert(`priceToBucket(${price}) === '${expected}'`, priceToBucket(price), expected)
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`)
console.log(`Result: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\nFAIL — update src/lib/blind-guess-vocab.ts (Task 31)\n')
  process.exit(1)
} else {
  console.log('\nPASS\n')
}
