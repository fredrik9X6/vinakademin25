/**
 * Import legacy wine reviews from the 2022 Webflow CSV export into the new
 * Wines + Reviews + Country/Region/Grape collections.
 *
 * Dry-run by default — pass --execute to actually write.
 *
 *   pnpm tsx --env-file=.env scripts/import-legacy-wine-reviews.ts data/legacy-wine-reviews-2022.csv
 *   pnpm tsx --env-file=.env scripts/import-legacy-wine-reviews.ts data/legacy-wine-reviews-2022.csv --execute
 *
 * To target staging/prod, point DATABASE_URI at the Railway connection string
 * for the run, e.g. `DATABASE_URI=postgres://... pnpm tsx ...`.
 */

import { readFileSync } from 'node:fs'
import { getPayload } from 'payload'
import config from '../src/payload.config'

// ─────────────────────────────────────────────────────────────────────────────
// CSV parsing — RFC 4180-ish, handles quoted fields with embedded commas/newlines
// ─────────────────────────────────────────────────────────────────────────────

type Row = Record<string, string>

function parseCsv(text: string): Row[] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        row.push(field)
        if (row.length > 1 || row[0] !== '') rows.push(row)
        row = []
        field = ''
      } else field += c
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  if (!rows.length) return []
  const headers = rows[0]
  return rows.slice(1).map((r) => {
    const o: Row = {}
    headers.forEach((h, i) => (o[h] = (r[i] ?? '').trim()))
    return o
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Minimal HTML → Lexical converter
// Webflow exports use simple <p>, <br>, <strong>, <em>, <a>; nothing exotic.
// ─────────────────────────────────────────────────────────────────────────────

type LexFormat = number // bitmask: 1=bold, 2=italic, 8=underline
const FMT_BOLD = 1
const FMT_ITALIC = 2

interface LexTextNode {
  type: 'text'
  text: string
  format: LexFormat
  detail: 0
  mode: 'normal'
  style: ''
  version: 1
}
interface LexLinkNode {
  type: 'link'
  fields: { url: string; newTab: boolean; linkType: 'custom' }
  format: ''
  indent: 0
  version: 3
  children: LexTextNode[]
  direction: 'ltr'
}
interface LexParagraphNode {
  type: 'paragraph'
  format: ''
  indent: 0
  version: 1
  textFormat: 0
  direction: 'ltr'
  children: Array<LexTextNode | LexLinkNode>
}
interface LexRoot {
  root: {
    type: 'root'
    format: ''
    indent: 0
    version: 1
    direction: 'ltr'
    children: LexParagraphNode[]
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')
}

function emptyLexical(): LexRoot {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          textFormat: 0,
          direction: 'ltr',
          children: [],
        },
      ],
    },
  }
}

function textNode(text: string, format: LexFormat = 0): LexTextNode {
  return { type: 'text', text, format, detail: 0, mode: 'normal', style: '', version: 1 }
}

function htmlToLexical(html: string): LexRoot {
  if (!html?.trim()) return emptyLexical()
  // Split on <p>...</p> blocks. Anything outside <p> becomes its own paragraph.
  const paragraphs: string[] = []
  const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = pRegex.exec(html)) !== null) {
    if (m.index > lastIndex) {
      const between = html.slice(lastIndex, m.index).trim()
      if (between) paragraphs.push(between)
    }
    paragraphs.push(m[1])
    lastIndex = m.index + m[0].length
  }
  if (lastIndex < html.length) {
    const tail = html.slice(lastIndex).trim()
    if (tail) paragraphs.push(tail)
  }
  if (!paragraphs.length) paragraphs.push(html)

  const lexParagraphs: LexParagraphNode[] = paragraphs.flatMap((p) => {
    // Split on <br> into separate paragraphs (Lexical doesn't have an inline break by default).
    const parts = p.split(/<br\s*\/?>/i)
    return parts.map((part) => ({
      type: 'paragraph' as const,
      format: '' as const,
      indent: 0 as const,
      version: 1 as const,
      textFormat: 0 as const,
      direction: 'ltr' as const,
      children: parseInline(part),
    }))
  })

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: lexParagraphs.length
        ? lexParagraphs
        : [
            {
              type: 'paragraph',
              format: '',
              indent: 0,
              version: 1,
              textFormat: 0,
              direction: 'ltr',
              children: [],
            },
          ],
    },
  }
}

function parseInline(html: string): Array<LexTextNode | LexLinkNode> {
  // Walk inline tags: <strong>, <b>, <em>, <i>, <a href>, plain text.
  const out: Array<LexTextNode | LexLinkNode> = []
  let cursor = 0
  const tagRegex = /<\/?(strong|b|em|i|a)\b([^>]*)>/gi
  const fmtStack: LexFormat[] = [0]
  let m: RegExpExecArray | null
  let pendingLinkUrl: string | null = null

  const pushText = (raw: string, fmt: LexFormat) => {
    const text = decodeEntities(raw.replace(/<[^>]+>/g, '')) // strip stray inline tags
    if (!text) return
    if (pendingLinkUrl !== null) {
      out.push({
        type: 'link',
        fields: { url: pendingLinkUrl, newTab: true, linkType: 'custom' },
        format: '',
        indent: 0,
        version: 3,
        children: [textNode(text, fmt)],
        direction: 'ltr',
      })
    } else {
      out.push(textNode(text, fmt))
    }
  }

  while ((m = tagRegex.exec(html)) !== null) {
    const before = html.slice(cursor, m.index)
    if (before) pushText(before, fmtStack[fmtStack.length - 1])
    const isClose = m[0].startsWith('</')
    const tag = m[1].toLowerCase()
    const attrs = m[2] || ''
    if (tag === 'a') {
      if (isClose) pendingLinkUrl = null
      else {
        const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i)
        pendingLinkUrl = hrefMatch ? hrefMatch[1] : null
      }
    } else {
      const fmtBit = tag === 'strong' || tag === 'b' ? FMT_BOLD : FMT_ITALIC
      if (isClose) fmtStack.pop()
      else fmtStack.push(fmtStack[fmtStack.length - 1] | fmtBit)
    }
    cursor = m.index + m[0].length
  }
  const tail = html.slice(cursor)
  if (tail) pushText(tail, fmtStack[fmtStack.length - 1])
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// WSET dictionary — slug → label (matches options in src/collections/Reviews.ts)
// ─────────────────────────────────────────────────────────────────────────────

// Appearance intensity: CSV "lätt"/"mellan"/"markant" → option "Blek"/"Mellan"/"Djup"
const INTENSITY_APPEARANCE: Record<string, string> = {
  lätt: 'Blek',
  blek: 'Blek',
  mellan: 'Mellan',
  markant: 'Djup',
  djup: 'Djup',
}

const COLOR: Record<string, string> = {
  citrongul: 'Citrongul',
  guld: 'Guld',
  bärnstensfärgad: 'Bärnstensfärgad',
  rosa: 'Rosa',
  'rosa-orange': 'Rosa-orange',
  orange: 'Orange',
  lila: 'Lila',
  rubinröd: 'Rubinröd',
  granatröd: 'Granatröd',
  läderfärgad: 'Läderfärgad',
}

// Nose/palate intensity: CSV "låg"/"mellan"/"markant"/"hög"
const INTENSITY_NOSE: Record<string, string> = {
  låg: 'Låg',
  lätt: 'Låg',
  mellan: 'Mellan',
  markant: 'Hög',
  hög: 'Hög',
}

// Sweetness: CSV "torr"/"halvtorr"/"mellan"/"söt"
const SWEETNESS: Record<string, string> = {
  torr: 'Torr',
  halvtorr: 'Halvtorr',
  mellan: 'Mellan',
  söt: 'Söt',
}

// Acid/Tannin/Alcohol: CSV "låg"/"mellan"/"hög"
const LMH: Record<string, string> = {
  låg: 'Låg',
  mellan: 'Mellan',
  hög: 'Hög',
}

// Body: CSV "tunn"/"mellan"/"tjock" → option "Lätt"/"Mellan"/"Fyllig"
const BODY: Record<string, string> = {
  tunn: 'Lätt',
  lätt: 'Lätt',
  mellan: 'Mellan',
  tjock: 'Fyllig',
  fyllig: 'Fyllig',
}

// Flavour intensity: CSV "låg"/"mellan"/"markant" → option "Låg"/"Medium"/"Uttalad"
const FLAVOUR_INTENSITY: Record<string, string> = {
  låg: 'Låg',
  mellan: 'Medium',
  medium: 'Medium',
  markant: 'Uttalad',
  uttalad: 'Uttalad',
}

const FINISH: Record<string, string> = {
  kort: 'Kort',
  mellan: 'Mellan',
  lång: 'Lång',
}

const WINE_TYPE: Record<string, 'red' | 'white' | 'rose' | 'sparkling' | 'orange' | 'fortified' | 'dessert'> = {
  'rött vin': 'red',
  'vitt vin': 'white',
  'rosévin': 'rose',
  'rosé vin': 'rose',
  'mousserande vin': 'sparkling',
  'mousserande': 'sparkling',
  'orangevin': 'orange',
  'orange vin': 'orange',
  'starkvin': 'fortified',
  'sött vin': 'dessert',
  'dessertvin': 'dessert',
}

const QUALITY: Record<string, string> = {
  dålig: 'Dålig',
  acceptabel: 'Acceptabel',
  bra: 'Bra',
  'mycket bra': 'Mycket bra',
  'mycket-bra': 'Mycket bra',
  enastående: 'Enastående',
  'extremt bra': 'Enastående',
}

// Aroma slugs → label (fully covers the list seen in the dataset)
const AROMA: Record<string, string> = {
  // Primary — fruit / floral / herbal
  jordgubbe: 'Jordgubbe',
  paron: 'Päron',
  persika: 'Persika',
  apelsin: 'Apelsin',
  citron: 'Citron',
  apple: 'Äpple',
  äpple: 'Äpple',
  krusbar: 'Krusbär',
  grapefrukt: 'Grapefrukt',
  druva: 'Druva',
  lime: 'Lime',
  aprikos: 'Aprikos',
  banan: 'Banan',
  nektarin: 'Nektarin',
  litchi: 'Litchi',
  mango: 'Mango',
  passionsfrukt: 'Passionsfrukt',
  melon: 'Melon',
  ananas: 'Ananas',
  tranbar: 'Tranbär',
  'roda-vinbar': 'Röda vinbär',
  hallon: 'Hallon',
  'roda-korsbar': 'Röda körsbär',
  'svarta-vinbar': 'Svarta vinbär',
  bjornbar: 'Björnbär',
  'morka-korsbar': 'Mörka körsbär',
  blabar: 'Blåbär',
  'morka-plommon': 'Mörka plommon',
  'roda-plommon': 'Röda plommon',
  blomma: 'Blomma',
  ros: 'Ros',
  viol: 'Viol',
  'gron-paprika': 'Grön paprika',
  gras: 'Gräs',
  tomatblad: 'Tomatblad',
  sparris: 'Sparris',
  eukalyptus: 'Eukalyptus',
  mynta: 'Mynta',
  fankal: 'Fänkål',
  dill: 'Dill',
  'torkade-orter': 'Torkade örter',
  'svart-vitpeppar': 'Svart- & Vitpeppar',
  lakrits: 'Lakrits',
  'omogen-frukt': 'Omogen frukt',
  'mogen-frukt': 'Mogen frukt',
  'blota-stenar': 'Blöta stenar',

  // Secondary — oak/yeast/MLF
  vanilj: 'Vanilj',
  ceder: 'Ceder',
  kex: 'Kex',
  brod: 'Bröd',
  broddeg: 'Bröddeg',
  yoghurt: 'yoghurt',
  gradde: 'Grädde',
  smor: 'Smör',
  ost: 'Ost',
  kokosnot: 'Kokosnöt',
  'forkolnat-tra': 'Förkolnat trä',
  rok: 'Rök',
  godis: 'Godis',
  bakverk: 'Bakverk',
  'rostat-brod': 'Rostat bröd',
  kryddnejlika: 'Kryddnejlika',
  kanel: 'Kanel',
  muskot: 'Muskot',
  ingefara: 'Ingefära',
  'kokt-frukt': 'Kokt frukt',
  kaffe: 'Kaffe',

  // Tertiary — aging
  choklad: 'Choklad',
  lader: 'Läder',
  kola: 'Kola',
  jord: 'Jord',
  svamp: 'Svamp',
  kott: 'Kött',
  tobak: 'Tobak',
  'blota-lov': 'Blöta löv',
  skogsbotten: 'Skogsbotten',
  apelsinmarmelad: 'Apelsinmarmelad',
  bensin: 'Bensin',
  mandel: 'Mandel',
  hasselnot: 'Hasselnöt',
  honung: 'Honung',
  'torkad-frukt': 'Torkad frukt',
  // Webflow had a few oddly-named tags; map best-effort:
  'rott-vin-torkad-frukt': 'Torkad frukt',
}

// WSET tier per canonical label
const PRIMARY_LABELS = new Set([
  'Jordgubbe','Päron','Persika','Apelsin','Citron','Äpple','Krusbär','Grapefrukt','Druva','Lime',
  'Aprikos','Banan','Nektarin','Litchi','Mango','Passionsfrukt','Melon','Ananas','Tranbär',
  'Röda vinbär','Hallon','Röda körsbär','Svarta vinbär','Björnbär','Mörka körsbär','Blåbär',
  'Mörka plommon','Röda plommon','Blomma','Ros','Viol','Grön paprika','Gräs','Tomatblad','Sparris',
  'Eukalyptus','Mynta','Fänkål','Dill','Torkade örter','Svart- & Vitpeppar','Lakrits',
  'Omogen frukt','Mogen frukt','Blöta stenar',
])
const SECONDARY_LABELS = new Set([
  'Vanilj','Ceder','Kex','Bröd','Bröddeg','yoghurt','Grädde','Smör','Ost','Kokosnöt','Förkolnat trä',
  'Rök','Godis','Bakverk','Rostat bröd','Kryddnejlika','Kanel','Muskot','Ingefära','Kokt frukt','Kaffe',
])
const TERTIARY_LABELS = new Set([
  'Choklad','Läder','Kola','Jord','Svamp','Kött','Tobak','Blöta löv','Skogsbotten','Apelsinmarmelad',
  'Bensin','Mandel','Hasselnöt','Honung','Torkad frukt',
])

// ─────────────────────────────────────────────────────────────────────────────
// Author email mapping
// ─────────────────────────────────────────────────────────────────────────────

const AUTHOR_EMAILS: Record<string, string> = {
  'Fredrik-Gustafson': 'fredrik@vinakademin.se',
  'Max-Eriksson': 'max@vinakademin.se',
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function slugToTitleCase(s: string): string {
  return s
    .split('-')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
    .trim()
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function convertRating(score: number): number {
  if (score >= 90) return 5
  if (score >= 80) return 4
  if (score >= 70) return 3
  if (score >= 60) return 2
  return 1
}

function splitMulti(value: string): string[] {
  return value
    .split(/;|,/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function mapAromas(slugs: string[], unmatched: Set<string>) {
  const primary: string[] = []
  const secondary: string[] = []
  const tertiary: string[] = []
  for (const raw of slugs) {
    const slug = raw.toLowerCase().trim()
    const label = AROMA[slug]
    if (!label) {
      unmatched.add(slug)
      continue
    }
    if (PRIMARY_LABELS.has(label)) primary.push(label)
    else if (SECONDARY_LABELS.has(label)) secondary.push(label)
    else if (TERTIARY_LABELS.has(label)) tertiary.push(label)
    else unmatched.add(`${slug}→${label} (no tier)`)
  }
  return { primary, secondary, tertiary }
}

function lookupOrWarn<T extends string>(
  raw: string,
  table: Record<string, T>,
  unmatched: Set<string>,
  fieldName: string,
): T | undefined {
  if (!raw) return undefined
  const key = raw.toLowerCase().trim()
  const hit = table[key]
  if (!hit) unmatched.add(`${fieldName}: ${raw}`)
  return hit
}

// ─────────────────────────────────────────────────────────────────────────────
// Find-or-create helpers
// ─────────────────────────────────────────────────────────────────────────────

type Payload = Awaited<ReturnType<typeof getPayload>>

async function findOrCreateCountry(payload: Payload, name: string, dryRun: boolean, userId: number) {
  const existing = await payload.find({
    collection: 'countries',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) return existing.docs[0].id as number
  if (dryRun) return -1
  const created = await payload.create({
    collection: 'countries',
    data: { name },
    overrideAccess: true,
    user: { id: userId, collection: 'users' } as any,
  })
  return created.id as number
}

async function findOrCreateRegion(
  payload: Payload,
  slug: string,
  countryId: number,
  dryRun: boolean,
  userId: number,
  explicitName?: string,
) {
  const name = explicitName ?? slugToTitleCase(slug)
  const existing = await payload.find({
    collection: 'regions',
    where: { or: [{ slug: { equals: slug } }, { name: { equals: name } }] },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) return existing.docs[0].id as number
  if (dryRun) return -1
  const created = await payload.create({
    collection: 'regions',
    data: { name, slug, country: countryId },
    overrideAccess: true,
    user: { id: userId, collection: 'users' } as any,
  })
  return created.id as number
}

async function findOrCreateGrape(payload: Payload, raw: string, dryRun: boolean, userId: number) {
  const name = slugToTitleCase(raw)
  const existing = await payload.find({
    collection: 'grapes',
    where: { name: { equals: name } },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) return existing.docs[0].id as number
  if (dryRun) return -1
  const created = await payload.create({
    collection: 'grapes',
    data: { name },
    overrideAccess: true,
    user: { id: userId, collection: 'users' } as any,
  })
  return created.id as number
}

async function findOrCreateWine(
  payload: Payload,
  args: {
    name: string
    winery: string
    vintage: number | null
    countryId: number
    regionId: number
    grapeIds: number[]
    price: number | null
    systembolagetUrl: string | null
    type: string | null
  },
  dryRun: boolean,
  userId: number,
) {
  const { name, winery, vintage } = args
  const existing = await payload.find({
    collection: 'wines',
    where: {
      and: [
        { name: { equals: name } },
        { winery: { equals: winery } },
        ...(vintage !== null ? [{ vintage: { equals: vintage } }] : []),
      ],
    },
    limit: 1,
    overrideAccess: true,
  })
  if (existing.docs.length) {
    const found: any = existing.docs[0]
    // Backfill type if missing
    if (!found.type && args.type && !dryRun) {
      await payload.update({
        collection: 'wines',
        id: found.id,
        data: { type: args.type as any },
        overrideAccess: true,
      })
    }
    return { id: found.id as number, created: false, backfilledType: !found.type && !!args.type }
  }
  if (dryRun) return { id: -1, created: true, backfilledType: false }
  const slug = slugify([name, winery, vintage ?? ''].filter(Boolean).join(' '))
  const created = await payload.create({
    collection: 'wines',
    data: {
      name,
      slug,
      winery,
      vintage: vintage ?? undefined,
      nonVintage: vintage === null,
      type: args.type as any,
      country: args.countryId,
      region: args.regionId,
      grapes: args.grapeIds,
      price: args.price ?? undefined,
      systembolagetUrl: args.systembolagetUrl ?? undefined,
    },
    overrideAccess: true,
    user: { id: userId, collection: 'users' } as any,
  })
  return { id: created.id as number, created: true, backfilledType: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2]
  const execute = process.argv.includes('--execute')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity
  if (!csvPath) {
    console.error(
      'Usage: tsx scripts/import-legacy-wine-reviews.ts <csv> [--execute] [--limit=N]',
    )
    process.exit(1)
  }
  const dryRun = !execute

  const text = readFileSync(csvPath, 'utf8')
  const allRows = parseCsv(text)
  const rows = Number.isFinite(limit) ? allRows.slice(0, limit) : allRows
  console.log(
    `📄 Parsed ${allRows.length} rows from ${csvPath}` +
      (Number.isFinite(limit) ? ` (limited to first ${limit})` : ''),
  )
  console.log(dryRun ? '🔍 DRY RUN — no writes.' : '🚀 EXECUTE — writing to DB.\n')

  const payload = await getPayload({ config })

  // Resolve author user IDs up front
  const userIdBySlug: Record<string, number> = {}
  for (const [slug, email] of Object.entries(AUTHOR_EMAILS)) {
    const u = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      overrideAccess: true,
    })
    if (!u.docs.length) {
      console.error(`❌ Missing user for ${email} (Författare ${slug}). Create the user first.`)
      process.exit(1)
    }
    userIdBySlug[slug] = u.docs[0].id as number
  }
  // Use Fredrik as the createdBy actor for all newly created wines/regions/etc
  const ownerUserId = userIdBySlug['Fredrik-Gustafson']

  const stats = {
    wineCreated: 0,
    wineFound: 0,
    typeBackfilled: 0,
    reviewCreated: 0,
    reviewSkipped: 0,
    errors: 0,
  }
  const unmatchedSlugs = new Set<string>()
  const unknownAuthors = new Set<string>()
  const errors: string[] = []

  for (const [i, row] of rows.entries()) {
    const lineNo = i + 2
    try {
      const wineName = [row['Namn'], row['Sub-namn??']].filter(Boolean).join(' ').trim()
      const winery = (row['Producent'] || '').trim()
      const vintageRaw = (row['Årgång'] || '').trim()
      const vintage = vintageRaw && /^\d{4}$/.test(vintageRaw) ? parseInt(vintageRaw, 10) : null
      const countryName = (row['Land'] || '').trim()
      const regionSlug = (row['Ursprung'] || '').trim().toLowerCase()
      const grapeRaw = (row['Druva'] || '').trim()
      const priceRaw = (row['Pris'] || '').trim()
      const price = priceRaw && /^\d+(\.\d+)?$/.test(priceRaw) ? parseFloat(priceRaw) : null
      const sysbolaget = (row['Länk till systembolaget'] || '').trim() || null

      let authorSlug = (row['Författare'] || '').trim()
      if (!authorSlug) {
        unknownAuthors.add('(empty → defaulted to Fredrik-Gustafson)')
        authorSlug = 'Fredrik-Gustafson'
      }
      if (!AUTHOR_EMAILS[authorSlug]) {
        unknownAuthors.add(authorSlug)
        throw new Error(`Unknown author "${authorSlug}"`)
      }
      const userId = userIdBySlug[authorSlug]

      if (!wineName || !winery || !countryName) {
        throw new Error(
          `Missing required field — name="${wineName}" winery="${winery}" country="${countryName}"`,
        )
      }

      const countryId = await findOrCreateCountry(payload, countryName, dryRun, ownerUserId)
      // Empty Ursprung → placeholder "Övrigt — <Country>" so the admin can backfill later.
      const isPlaceholderRegion = !regionSlug
      const effectiveRegionSlug = regionSlug || `ovrigt-${slugify(countryName)}`
      const placeholderRegionName = isPlaceholderRegion ? `Övrigt — ${countryName}` : undefined
      const regionId = await findOrCreateRegion(
        payload,
        effectiveRegionSlug,
        countryId,
        dryRun,
        ownerUserId,
        placeholderRegionName,
      )
      const grapeIds: number[] = []
      for (const g of splitMulti(grapeRaw)) {
        grapeIds.push(await findOrCreateGrape(payload, g, dryRun, ownerUserId))
      }
      if (!grapeIds.length) throw new Error('No grapes parsed')

      const typeRaw = (row['Typ'] || '').trim().toLowerCase()
      const mappedType = typeRaw ? WINE_TYPE[typeRaw] || null : null
      if (typeRaw && !mappedType) unmatchedSlugs.add(`type: ${row['Typ']}`)

      const wineResult = await findOrCreateWine(
        payload,
        {
          name: wineName,
          winery,
          vintage,
          countryId,
          regionId,
          grapeIds,
          price,
          systembolagetUrl: sysbolaget,
          type: mappedType,
        },
        dryRun,
        ownerUserId,
      )
      if (wineResult.created) stats.wineCreated++
      else stats.wineFound++
      if (wineResult.backfilledType) stats.typeBackfilled++

      // Build WSET tasting object
      const noseAromas = mapAromas(splitMulti(row['Karaktär (doft)'] || ''), unmatchedSlugs)
      const palateAromas = mapAromas(splitMulti(row['Karaktär (smak)'] || ''), unmatchedSlugs)

      const wsetTasting = {
        appearance: {
          intensity: lookupOrWarn(
            row['Intensitet (utseende)'] || '',
            INTENSITY_APPEARANCE,
            unmatchedSlugs,
            'appearance.intensity',
          ),
          color: lookupOrWarn(row['Färg'] || '', COLOR, unmatchedSlugs, 'color'),
        },
        nose: {
          intensity: lookupOrWarn(
            row['Intensitet (doft)'] || '',
            INTENSITY_NOSE,
            unmatchedSlugs,
            'nose.intensity',
          ),
          primaryAromas: noseAromas.primary.length ? noseAromas.primary : undefined,
          secondaryAromas: noseAromas.secondary.length ? noseAromas.secondary : undefined,
          tertiaryAromas: noseAromas.tertiary.length ? noseAromas.tertiary : undefined,
        },
        palate: {
          sweetness: lookupOrWarn(row['Sötma'] || '', SWEETNESS, unmatchedSlugs, 'sweetness'),
          acidity: lookupOrWarn(row['Syra'] || '', LMH, unmatchedSlugs, 'acidity'),
          tannin: lookupOrWarn(row['Tanniner'] || '', LMH, unmatchedSlugs, 'tannin'),
          alcohol: lookupOrWarn(row['Alkohol'] || '', LMH, unmatchedSlugs, 'alcohol'),
          body: lookupOrWarn(row['Fyllighet'] || '', BODY, unmatchedSlugs, 'body'),
          flavourIntensity: lookupOrWarn(
            row['Intensitet (smak)'] || '',
            FLAVOUR_INTENSITY,
            unmatchedSlugs,
            'flavourIntensity',
          ),
          primaryFlavours: palateAromas.primary.length ? palateAromas.primary : undefined,
          secondaryFlavours: palateAromas.secondary.length ? palateAromas.secondary : undefined,
          tertiaryFlavours: palateAromas.tertiary.length ? palateAromas.tertiary : undefined,
          finish: lookupOrWarn(row['Avslut'] || '', FINISH, unmatchedSlugs, 'finish'),
        },
        conclusion: {
          quality: lookupOrWarn(row['Kvalité'] || '', QUALITY, unmatchedSlugs, 'quality'),
          summary: [row['Titel'], row['Kort beskrivning']]
            .map((s) => (s || '').trim())
            .filter(Boolean)
            .join('\n\n— '),
        },
      }

      const ratingScore = parseInt((row['Vinakademins betyg'] || '0').trim(), 10) || 0
      const rating = convertRating(ratingScore)
      const reviewText = htmlToLexical(row['Recension'] || '')

      // Idempotency: skip if a review already exists for this (wine, user)
      if (!wineResult.created) {
        const existingReview = await payload.find({
          collection: 'reviews',
          where: {
            and: [{ wine: { equals: wineResult.id } }, { user: { equals: userId } }],
          },
          limit: 1,
          overrideAccess: true,
        })
        if (existingReview.docs.length) {
          stats.reviewSkipped++
          continue
        }
      }

      if (!dryRun) {
        // Omit the `user` argument so Reviews' beforeChange hook doesn't silently
        // flip isTrusted=false (it demotes when req.user is non-admin) or overwrite
        // data.user with req.user.id. With no req.user the hook returns data early.
        await payload.create({
          collection: 'reviews',
          data: {
            wine: wineResult.id,
            user: userId,
            rating,
            reviewText: reviewText as any,
            isTrusted: true,
            wsetTasting: wsetTasting as any,
          },
          overrideAccess: true,
        })
      }
      stats.reviewCreated++

      if (i < 3 || (i + 1) % 25 === 0) {
        console.log(
          `  ${String(lineNo).padStart(3)} ✓ ${wineName} (${vintage ?? 'NV'}) — ${authorSlug} → ${rating}★`,
        )
      }
    } catch (e: any) {
      stats.errors++
      const msg = `Row ${lineNo}: ${e?.message || e}`
      errors.push(msg)
      console.error(`  ${String(lineNo).padStart(3)} ✗ ${msg}`)
    }
  }

  console.log('\n──────── Summary ────────')
  console.log(
    `Wines:    ${stats.wineCreated} created, ${stats.wineFound} found, ${stats.typeBackfilled} types backfilled`,
  )
  console.log(`Reviews:  ${stats.reviewCreated} created, ${stats.reviewSkipped} skipped (already existed)`)
  console.log(`Errors:   ${stats.errors}`)
  if (unmatchedSlugs.size) {
    console.log(`\n⚠️  Unmatched slugs (${unmatchedSlugs.size}):`)
    ;[...unmatchedSlugs].sort().forEach((s) => console.log(`   - ${s}`))
  }
  if (unknownAuthors.size) {
    console.log(`\n⚠️  Unknown authors:`)
    ;[...unknownAuthors].forEach((s) => console.log(`   - ${s}`))
  }
  if (errors.length && errors.length <= 10) {
    console.log('\nFirst errors:')
    errors.slice(0, 10).forEach((e) => console.log(`   ${e}`))
  }
  console.log(dryRun ? '\n🔍 dry-run only — re-run with --execute to write.' : '\n✅ done.')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
