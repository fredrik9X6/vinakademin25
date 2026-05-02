/**
 * Idempotent seed for Vinkompassen — creates the four archetype docs and
 * eight quiz questions if they don't yet exist (matching by `key` for
 * archetypes and by `order` for questions). Re-running is safe — never
 * overwrites editor-curated fields like recommendedWines or final copy.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

type ArchetypeSeed = {
  key: 'light-classic' | 'light-adventurous' | 'bold-classic' | 'bold-adventurous'
  name: string
  tagline: string
  beehiivTag: string
  description: string
}

const ARCHETYPES: ArchetypeSeed[] = [
  {
    key: 'light-classic',
    name: 'Den Friska Traditionalisten',
    tagline: 'Klara, rena viner med syra och elegans.',
    beehiivTag: 'vk-light-classic',
    description: 'Du älskar viner som är klara, rena och eleganta...',
  },
  {
    key: 'light-adventurous',
    name: 'Den Nyfikna Upptäckaren',
    tagline: 'Lätta viner med en oväntad twist.',
    beehiivTag: 'vk-light-adventurous',
    description: 'Du söker det oväntade — pét-nat, orange wine, svalt och spännande...',
  },
  {
    key: 'bold-classic',
    name: 'Den Trygga Kraftmänniskan',
    tagline: 'Fyllig komfort i klassisk form.',
    beehiivTag: 'vk-bold-classic',
    description: 'Bordeaux, Barolo, ekfat-Chardonnay — du vill ha tyngden och historien...',
  },
  {
    key: 'bold-adventurous',
    name: 'Den Vågade Äventyraren',
    tagline: 'Stora, ovanliga smaker — du säger ja.',
    beehiivTag: 'vk-bold-adventurous',
    description: 'Etna Rosso, Pinotage, naturlig Syrah — du vill ha intensitet OCH ovanlighet...',
  },
]

type QuestionSeed = {
  order: number
  question: string
  helperText?: string
  answers: Array<{ label: string; scoreBody: number; scoreComfort: number }>
}

const QUESTIONS: QuestionSeed[] = [
  {
    order: 1,
    question: 'Hur ser en perfekt fredagskväll ut?',
    answers: [
      { label: 'Picknick i parken med vänner', scoreBody: -2, scoreComfort: 0 },
      { label: 'Lugnt hemma med en bok', scoreBody: -1, scoreComfort: -2 },
      { label: 'Middag med dukad bordsservis', scoreBody: 1, scoreComfort: -1 },
      { label: 'Något jag aldrig gjort förut', scoreBody: 0, scoreComfort: 2 },
    ],
  },
  {
    order: 2,
    question: 'Vilken maträtt drar du mest mot?',
    answers: [
      { label: 'Sushi och sallader', scoreBody: -2, scoreComfort: 0 },
      { label: 'Klassisk biff med rödvinssås', scoreBody: 2, scoreComfort: -1 },
      { label: 'Marockansk tagine eller indisk curry', scoreBody: 1, scoreComfort: 2 },
      { label: 'Pasta med smör och parmesan', scoreBody: 0, scoreComfort: -2 },
    ],
  },
  {
    order: 3,
    question: 'Vilken musikstil känns rätt just nu?',
    answers: [
      { label: 'Akustiskt och lugnt', scoreBody: -2, scoreComfort: -1 },
      { label: 'Klassisk pop med tydlig melodi', scoreBody: 0, scoreComfort: -2 },
      { label: 'Något experimentellt jag aldrig hört', scoreBody: 0, scoreComfort: 2 },
      { label: 'Stora, kraftiga produktioner', scoreBody: 2, scoreComfort: 1 },
    ],
  },
  {
    order: 4,
    question: 'Drömsemestern går till...',
    answers: [
      { label: 'En kuststad i Frankrike', scoreBody: -1, scoreComfort: -2 },
      { label: 'En toskansk vingård', scoreBody: 2, scoreComfort: -1 },
      { label: 'En liten by i Georgien eller Armenien', scoreBody: 0, scoreComfort: 2 },
      { label: 'Ett hippt nystart-distrikt i Sydafrika eller Chile', scoreBody: 1, scoreComfort: 2 },
    ],
  },
  {
    order: 5,
    question: 'Vilken doft tilltalar dig mest?',
    answers: [
      { label: 'Citron och nyklippt gräs', scoreBody: -2, scoreComfort: -1 },
      { label: 'Mörka bär och tobak', scoreBody: 2, scoreComfort: -1 },
      { label: 'Jord och mossa efter regn', scoreBody: 1, scoreComfort: 2 },
      { label: 'Vita blommor och persika', scoreBody: -1, scoreComfort: 0 },
    ],
  },
  {
    order: 6,
    question: 'Sommardrycken är...',
    answers: [
      { label: 'Iskall sparkling', scoreBody: -2, scoreComfort: 0 },
      { label: 'Klassisk gin & tonic', scoreBody: 0, scoreComfort: -2 },
      { label: 'Naturlig pét-nat', scoreBody: -1, scoreComfort: 2 },
      { label: 'Mörk negroni', scoreBody: 2, scoreComfort: 0 },
    ],
  },
  {
    order: 7,
    question: 'På fest är du den som...',
    answers: [
      { label: 'Lyssnar mer än pratar', scoreBody: -1, scoreComfort: -1 },
      { label: 'Drar igång en diskussion om något oväntat', scoreBody: 0, scoreComfort: 2 },
      { label: 'Ser till att alla har det bra', scoreBody: 0, scoreComfort: -1 },
      { label: 'Är där tills bara grundgänget är kvar', scoreBody: 2, scoreComfort: 1 },
    ],
  },
  {
    order: 8,
    question: 'Vilken upplevelse drar dig mest?',
    answers: [
      { label: 'En oklanderlig restaurang med vit duk', scoreBody: 1, scoreComfort: -2 },
      { label: 'En naturvinsbar i kväll', scoreBody: 0, scoreComfort: 2 },
      { label: 'En picknick på en sommaräng', scoreBody: -2, scoreComfort: -1 },
      { label: 'Ett rökigt grillrestaurang-besök', scoreBody: 2, scoreComfort: 1 },
    ],
  },
]

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
