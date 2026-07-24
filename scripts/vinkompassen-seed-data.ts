/**
 * Canonical seed data for Vinkompassen — the four archetypes and eight quiz
 * questions. Shared by:
 *   - scripts/seed-vinkompassen.ts          (idempotent create for fresh envs)
 *   - scripts/update-vinkompass-questions.ts (surgical update of edited questions)
 *
 * Keeping the data in one place means the seed and the update script can never
 * drift apart. Each answer carries scoreBody (-2 light .. +2 bold) and
 * scoreComfort (-2 classic .. +2 adventurous); the scoring axes are documented
 * in src/collections/VinkompassQuestions.ts.
 */

export type ArchetypeSeed = {
  key: 'light-classic' | 'light-adventurous' | 'bold-classic' | 'bold-adventurous'
  name: string
  tagline: string
  beehiivTag: string
  description: string
}

export const ARCHETYPES: ArchetypeSeed[] = [
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

export type QuestionSeed = {
  order: number
  question: string
  helperText?: string
  answers: Array<{ label: string; scoreBody: number; scoreComfort: number }>
}

export const QUESTIONS: QuestionSeed[] = [
  {
    order: 1,
    question: 'Hur ser en perfekt fredagskväll ut?',
    answers: [
      { label: 'Ute på stan med vänner', scoreBody: -1, scoreComfort: 1 },
      { label: 'Hemma i soffan och mysa', scoreBody: 1, scoreComfort: -2 },
      { label: 'Middag hemma med några nära', scoreBody: 0, scoreComfort: -1 },
      { label: 'Hitta på något spontant vi aldrig gjort', scoreBody: 0, scoreComfort: 2 },
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
    question: 'Vad spelar du helst på högtalaren hemma?',
    answers: [
      { label: 'Skönt och akustiskt — jazz eller singer-songwriter', scoreBody: -2, scoreComfort: -1 },
      { label: 'Låtar jag kan utantill och aldrig tröttnar på', scoreBody: 1, scoreComfort: -2 },
      { label: 'En ny artist innan alla andra hittat den', scoreBody: -1, scoreComfort: 2 },
      { label: 'Något basigt som fyller hela rummet', scoreBody: 2, scoreComfort: 1 },
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
    question: 'Var hänger du helst en kväll ute?',
    answers: [
      { label: 'En klassisk bistro med vitt linne och trygg meny', scoreBody: 1, scoreComfort: -2 },
      { label: 'Ett fräscht ställe med små rätter och bubbel', scoreBody: -2, scoreComfort: -1 },
      { label: 'En naturvinsbar med skivspelare i hörnet', scoreBody: -1, scoreComfort: 2 },
      { label: 'Ett mörkt ställe med grill och stora rödviner', scoreBody: 2, scoreComfort: 1 },
    ],
  },
]
