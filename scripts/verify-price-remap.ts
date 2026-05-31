/**
 * Task 33 verification script.
 *
 * Asserts that remapLegacyPriceBucket correctly maps every old (5-bucket)
 * value to the expected new (6-bucket) value.
 *
 * Run with:   npx tsx scripts/verify-price-remap.ts
 */

import { remapLegacyPriceBucket } from '../src/lib/blind-guess-vocab'

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

type OldBucket = 'under_100' | '100_200' | '200_300' | '300_500' | '500_plus'

console.log('\n── remapLegacyPriceBucket (all 5 old → new) ──')

const cases: Array<[OldBucket, string]> = [
  ['under_100', '0_99'],
  ['100_200',   '100_149'],
  ['200_300',   '200_249'],
  ['300_500',   '300_plus'],
  ['500_plus',  '300_plus'],
]

for (const [old, expected] of cases) {
  assert(`remap('${old}') === '${expected}'`, remapLegacyPriceBucket(old), expected)
}

console.log(`\n${'─'.repeat(40)}`)
console.log(`Result: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.error('\nFAIL\n')
  process.exit(1)
} else {
  console.log('\nPASS\n')
}
