/**
 * Verification for the blind-guess answer pipeline fixes:
 *
 *   1. buildBlindAnswersByPour resolves library-wine country/grape relations
 *      whether they arrive populated (objects) or as bare id numbers (the
 *      depth-2 session load that silently disabled scoring before).
 *   2. Host overrides always win over library data.
 *   3. Blends keep ALL grape names as acceptable answers, and scoreOne
 *      accepts any of them.
 *   4. pickEasyModeOptions with count 5 always contains the primary grape,
 *      returns 5 options, and is deterministic per seed.
 *
 * Run with:   npx tsx scripts/verify-blind-answers.ts
 */

import type { Payload } from 'payload'
import { buildBlindAnswersByPour } from '../src/lib/blind-answers'
import { scoreOne } from '../src/lib/blind-guess-scoring'
import { pickEasyModeOptions } from '../src/lib/blind-guess-decoys'
import { GRAPES } from '../src/lib/blind-guess-vocab'
import {
  canonicalizeGrapes,
  fillBlindAnswersFromSystembolaget,
} from '../src/lib/systembolaget-blind-answers'

let passed = 0
let failed = 0

function assert(description: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ✓ ${description}`)
    passed++
  } else {
    console.error(`  ✗ ${description}`, detail === undefined ? '' : JSON.stringify(detail))
    failed++
  }
}

// Stub payload: only `find` is used by the resolver.
const stubPayload = {
  find: async ({ collection, where }: { collection: string; where: any }) => {
    const ids: number[] = where?.id?.in ?? []
    if (collection === 'countries') {
      const db: Record<number, string> = { 1: 'Frankrike', 2: 'Italien' }
      return { docs: ids.filter((i) => db[i]).map((i) => ({ id: i, name: db[i] })) }
    }
    if (collection === 'grapes') {
      const db: Record<number, string> = { 10: 'Syrah', 11: 'Grenache', 12: 'Mourvèdre' }
      return { docs: ids.filter((i) => db[i]).map((i) => ({ id: i, name: db[i] })) }
    }
    return { docs: [] }
  },
} as unknown as Payload

async function main() {
  console.log('buildBlindAnswersByPour:')
  const wines = [
    {
      // Pour 1: populated library wine (page-style depth) — blend
      pourOrder: 1,
      libraryWine: {
        country: { name: 'Spanien' },
        grapes: [{ name: 'Tempranillo' }, { name: 'Garnacha' }],
        price: 149,
      },
    },
    {
      // Pour 2: bare-id library wine (stream/recap depth-2 style)
      pourOrder: 2,
      libraryWine: { country: 1, grapes: [10, 11, 12], price: 249 },
    },
    {
      // Pour 3: overrides beat library data
      pourOrder: 3,
      libraryWine: { country: 2, grapes: [10], price: 99 },
      blindAnswerCountry: 'Portugal',
      blindAnswerGrapes: ['Touriga Nacional'],
      blindAnswerPriceBucket: '300_plus',
    },
    {
      // Pour 4: custom wine — no library fallback, price from snapshot
      pourOrder: 4,
      customWine: { priceSek: 179 },
      blindAnswerGrapes: ['Zweigelt'],
    },
  ]
  const answers = await buildBlindAnswersByPour(stubPayload, wines)

  const a1 = answers.get(1)!
  assert('pour 1: populated country name used', a1.country === 'Spanien')
  assert(
    'pour 1: ALL blend grapes kept',
    JSON.stringify(a1.grapes) === JSON.stringify(['Tempranillo', 'Garnacha']),
    a1.grapes,
  )
  assert('pour 1: raw price carried', a1.priceSek === 149)

  const a2 = answers.get(2)!
  assert('pour 2: bare country id resolved to name', a2.country === 'Frankrike', a2.country)
  assert(
    'pour 2: bare grape ids resolved (all of the blend)',
    JSON.stringify(a2.grapes) === JSON.stringify(['Syrah', 'Grenache', 'Mourvèdre']),
    a2.grapes,
  )

  const a3 = answers.get(3)!
  assert('pour 3: override country wins', a3.country === 'Portugal')
  assert(
    'pour 3: override grapes win',
    JSON.stringify(a3.grapes) === JSON.stringify(['Touriga Nacional']),
  )
  assert('pour 3: override price bucket wins', a3.priceBucket === '300_plus')

  const a4 = answers.get(4)!
  assert('pour 4: custom wine has no country', a4.country == null)
  assert('pour 4: custom wine price from snapshot', a4.priceSek === 179)

  console.log('scoreOne blend acceptance:')
  const blendAnswer = { country: 'Frankrike', grapes: ['Syrah', 'Grenache', 'Mourvèdre'], priceSek: 249 }
  assert(
    'secondary blend grape scores as correct',
    scoreOne({ guessedGrape: 'grenache' }, blendAnswer).grapeCorrect,
  )
  assert(
    'non-blend grape scores as wrong',
    !scoreOne({ guessedGrape: 'Merlot' }, blendAnswer).grapeCorrect,
  )

  console.log('pickEasyModeOptions (primary + 4 decoys):')
  const blendGrapes = ['Syrah', 'Grenache', 'Mourvèdre']
  const pool = (GRAPES as ReadonlyArray<string>).filter(
    (g) => !blendGrapes.some((b) => b.toLocaleLowerCase('sv') === g.toLocaleLowerCase('sv')),
  )
  const opts = pickEasyModeOptions({
    pool,
    answers: [blendGrapes[0]],
    count: 5,
    seed: '42:1:grape',
  })!
  assert('returns 5 options', opts.length === 5, opts)
  assert('primary grape included', opts.includes('Syrah'), opts)
  assert(
    'no other blend grape leaks in as a decoy',
    !opts.includes('Grenache') && !opts.includes('Mourvèdre'),
    opts,
  )
  const opts2 = pickEasyModeOptions({ pool, answers: ['Syrah'], count: 5, seed: '42:1:grape' })!
  assert('deterministic per seed', JSON.stringify(opts) === JSON.stringify(opts2))

  console.log('canonicalizeGrapes:')
  const curated = ['Primitivo', 'Syrah', 'Grenache']
  assert(
    'case-insensitive canonical match + passthrough for unknown',
    JSON.stringify(canonicalizeGrapes(['primitivo', ' Zweigelt ', 'SYRAH'], curated)) ===
      JSON.stringify(['Primitivo', 'Zweigelt', 'Syrah']),
    canonicalizeGrapes(['primitivo', ' Zweigelt ', 'SYRAH'], curated),
  )

  console.log('fillBlindAnswersFromSystembolaget:')
  const catalogDb: Record<string, { country: string | null; grapes: string[] }> = {
    '7702': { country: 'Italien', grapes: ['primitivo'] },
    '1234': { country: 'Frankrike', grapes: [] },
  }
  const makeStub = (opts?: { throwOnQuery?: boolean }) =>
    ({
      db: {
        pool: {
          query: async (_text: string, params: unknown[]) => {
            if (opts?.throwOnQuery) throw new Error('relation does not exist')
            const nums = params[0] as string[]
            return {
              rows: nums
                .filter((n) => catalogDb[n])
                .map((n) => ({ product_number: n, ...catalogDb[n] })),
            }
          },
        },
      },
      find: async () => ({ docs: [{ name: 'Primitivo' }, { name: 'Syrah' }] }),
      logger: { warn: () => {} },
    }) as unknown as Payload

  const fillWines = [
    // SB wine, empty answers → filled (grapes canonicalized)
    { customWine: { systembolagetProductNumber: '7702' }, blindAnswerCountry: null, blindAnswerGrapes: [] },
    // SB wine, host already set values → untouched
    { customWine: { systembolagetProductNumber: '7702' }, blindAnswerCountry: 'Spanien', blindAnswerGrapes: ['Tempranillo'] },
    // SB wine with catalog country but no grapes → country only
    { customWine: { systembolagetProductNumber: '1234' }, blindAnswerCountry: null, blindAnswerGrapes: [] },
    // non-SB custom wine → untouched
    { customWine: { name: 'Eget vin' }, blindAnswerCountry: null, blindAnswerGrapes: [] },
  ]
  const filled = await fillBlindAnswersFromSystembolaget(makeStub(), fillWines as never[])
  assert('changed flagged', filled.changed === true)
  const f0 = filled.wines[0] as (typeof fillWines)[0]
  assert('empty SB wine gets country', f0.blindAnswerCountry === 'Italien', f0)
  assert(
    'empty SB wine gets canonicalized grapes',
    JSON.stringify(f0.blindAnswerGrapes) === JSON.stringify(['Primitivo']),
    f0.blindAnswerGrapes,
  )
  const f1 = filled.wines[1] as (typeof fillWines)[1]
  assert(
    'host-set values never overwritten',
    f1.blindAnswerCountry === 'Spanien' &&
      JSON.stringify(f1.blindAnswerGrapes) === JSON.stringify(['Tempranillo']),
  )
  const f2 = filled.wines[2] as (typeof fillWines)[2]
  assert('country-only catalog hit fills country only', f2.blindAnswerCountry === 'Frankrike')
  assert('grapes stay empty when catalog has none', (f2.blindAnswerGrapes ?? []).length === 0)
  const f3 = filled.wines[3] as (typeof fillWines)[3]
  assert('non-SB wine untouched', f3.blindAnswerCountry == null)

  const noop = await fillBlindAnswersFromSystembolaget(makeStub(), [
    { customWine: { systembolagetProductNumber: '7702' }, blindAnswerCountry: 'Italien', blindAnswerGrapes: ['Primitivo'] },
  ] as never[])
  assert('fully-answered wines → changed=false', noop.changed === false)

  const failedFill = await fillBlindAnswersFromSystembolaget(makeStub({ throwOnQuery: true }), fillWines as never[])
  assert('query failure never throws — returns unchanged', failedFill.changed === false)

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

void main()
