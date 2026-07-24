/**
 * Idempotent seed for Vinkompassen — creates the four archetype docs and
 * eight quiz questions if they don't yet exist (matching by `key` for
 * archetypes and by `order` for questions). Re-running is safe — never
 * overwrites editor-curated fields like recommendedWines or final copy.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import { ARCHETYPES, QUESTIONS } from './vinkompassen-seed-data'

async function main() {
  const payload = await getPayload({ config: await config })

  // Archetypes — upsert by `key`
  for (const a of ARCHETYPES) {
    const existing = await payload.find({
      collection: 'vinkompass-archetypes',
      where: { key: { equals: a.key } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      console.log(`[archetype] exists, skipping: ${a.key}`)
    } else {
      await payload.create({
        collection: 'vinkompass-archetypes',
        data: {
          key: a.key,
          name: a.name,
          tagline: a.tagline,
          beehiivTag: a.beehiivTag,
          // Lexical richText placeholder — paragraph node
          description: {
            root: {
              type: 'root',
              format: '',
              indent: 0,
              version: 1,
              children: [
                {
                  type: 'paragraph',
                  format: '',
                  indent: 0,
                  version: 1,
                  children: [{ type: 'text', text: a.description, format: 0, version: 1 }],
                },
              ],
              direction: 'ltr',
            },
          } as never,
        },
      })
      console.log(`[archetype] created: ${a.key}`)
    }
  }

  // Questions — upsert by `order`
  for (const q of QUESTIONS) {
    const existing = await payload.find({
      collection: 'vinkompass-questions',
      where: { order: { equals: q.order } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      console.log(`[question] exists, skipping: order=${q.order}`)
    } else {
      await payload.create({
        collection: 'vinkompass-questions',
        data: {
          order: q.order,
          question: q.question,
          helperText: q.helperText,
          answers: q.answers,
          active: true,
        },
      })
      console.log(`[question] created: order=${q.order}`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
