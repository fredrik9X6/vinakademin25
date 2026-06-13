/**
 * Sanity-check script for getCourseWineAggregate.
 *
 * No test runner is configured in this repo, so this is a one-shot script that
 * exits 0 on pass and 1 on fail. Run with `pnpm exec tsx scripts/test-wine-aggregate.ts`.
 */

import { getCourseWineAggregate } from '../src/lib/course/wine-aggregate'

let passed = 0
let failed = 0

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    console.log(`  ✗ ${name}`)
    console.log(`      expected: ${e}`)
    console.log(`      actual:   ${a}`)
  }
}

console.log('wine-aggregate sanity checks')

check('empty input → zero', getCourseWineAggregate(null), { count: 0, totalSek: 0 })
check('non-object input → zero', getCourseWineAggregate('hello'), { count: 0, totalSek: 0 })
check('tree with no blocks → zero', getCourseWineAggregate({
  root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'hi' }] }] },
}), { count: 0, totalSek: 0 })

check('one wine-list with 3 wines (100 + 150 + 250)', getCourseWineAggregate({
  root: {
    children: [
      {
        type: 'block',
        fields: {
          blockType: 'wine-list',
          wines: [
            { id: 1, price: 100 },
            { id: 2, price: 150 },
            { id: 3, price: 250 },
          ],
        },
      },
    ],
  },
}), { count: 3, totalSek: 500 })

check('two wine-list blocks summed', getCourseWineAggregate({
  root: {
    children: [
      { type: 'block', fields: { blockType: 'wine-list', wines: [{ id: 1, price: 99 }] } },
      { type: 'block', fields: { blockType: 'wine-list', wines: [{ id: 2, price: 200 }, { id: 3, price: 50 }] } },
    ],
  },
}), { count: 3, totalSek: 349 })

check('wine with missing price → counted, price 0', getCourseWineAggregate({
  root: {
    children: [
      {
        type: 'block',
        fields: { blockType: 'wine-list', wines: [{ id: 1 }, { id: 2, price: 100 }] },
      },
    ],
  },
}), { count: 2, totalSek: 100 })

check('wine-list nested deep in tree', getCourseWineAggregate({
  root: {
    children: [
      {
        type: 'paragraph',
        children: [
          {
            type: 'block',
            fields: { blockType: 'wine-list', wines: [{ id: 1, price: 75 }] },
          },
        ],
      },
    ],
  },
}), { count: 1, totalSek: 75 })

check('wine-list with string price gets parsed', getCourseWineAggregate({
  root: {
    children: [
      { type: 'block', fields: { blockType: 'wine-list', wines: [{ id: 1, price: '200' }] } },
    ],
  },
}), { count: 1, totalSek: 200 })

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
