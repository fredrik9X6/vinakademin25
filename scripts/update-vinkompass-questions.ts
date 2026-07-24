/**
 * Surgical update of specific Vinkompassen questions from the canonical data in
 * scripts/vinkompassen-seed-data.ts. Unlike the seed (which only *creates*
 * missing questions), this UPDATES existing question docs in place — matched by
 * `order` — replacing their `question` text and `answers` array.
 *
 * It only touches the orders listed in ORDERS_TO_UPDATE, so editor-curated copy
 * on the other questions is never disturbed.
 *
 * Usage (targets whatever DATABASE_URI the env-file resolves to):
 *   Dry run (default — reads + prints the diff, writes nothing):
 *     npx tsx --env-file=.env scripts/update-vinkompass-questions.ts
 *   Apply:
 *     npx tsx --env-file=.env scripts/update-vinkompass-questions.ts --apply
 *
 * ALWAYS dry-run first and confirm the printed DB host is the one you intend.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import { QUESTIONS } from './vinkompassen-seed-data'

// The questions changed in this content pass. Keep this list explicit so we
// never clobber the untouched, potentially editor-curated questions.
const ORDERS_TO_UPDATE = [1, 3, 8]

const APPLY = process.argv.includes('--apply')

function dbHost(): string {
  const uri = process.env.DATABASE_URI || process.env.POSTGRES_URL || ''
  const m = uri.match(/@([^/]+)\//)
  return m?.[1]?.replace(/\?.*$/, '') ?? '(unknown)'
}

async function main() {
  console.log(`\n${APPLY ? '⚠️  APPLY' : '🔍 DRY RUN'} — target DB host: ${dbHost()}\n`)

  const payload = await getPayload({ config: await config })

  let changed = 0
  for (const order of ORDERS_TO_UPDATE) {
    const q = QUESTIONS.find((x) => x.order === order)
    if (!q) throw new Error(`No canonical question with order=${order} in seed data`)

    // limit: 2 so we can detect (and refuse) duplicate rows for the same order
    const found = await payload.find({
      collection: 'vinkompass-questions',
      where: { order: { equals: order } },
      limit: 2,
      depth: 0,
    })

    if (found.docs.length === 0) {
      console.warn(`[order ${order}] not found — skipping (run seed:vinkompassen first?)`)
      continue
    }
    if (found.docs.length > 1) {
      throw new Error(`[order ${order}] found ${found.docs.length} docs — refusing to update ambiguously`)
    }

    const doc = found.docs[0]
    console.log(`[order ${order}] id=${doc.id}`)
    console.log(`  question: "${doc.question}"`)
    console.log(`         -> "${q.question}"`)
    const oldLabels = (doc.answers ?? []).map((a) => a.label).join(' | ')
    const newLabels = q.answers.map((a) => a.label).join(' | ')
    console.log(`  answers:  ${oldLabels}`)
    console.log(`         -> ${newLabels}`)

    if (APPLY) {
      await payload.update({
        collection: 'vinkompass-questions',
        id: doc.id,
        data: {
          question: q.question,
          helperText: q.helperText ?? null,
          answers: q.answers,
        },
      })
      console.log(`  ✅ updated`)
    }
    changed++
    console.log('')
  }

  console.log(APPLY ? `Done — updated ${changed} question(s).` : `Dry run — ${changed} question(s) would change. Re-run with --apply to write.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
