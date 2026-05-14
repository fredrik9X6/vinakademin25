/**
 * Backfill missing `wines.image` from Systembolaget's CDN.
 *
 * Strategy:
 *   1. Find wines where image is null AND systembolagetUrl is set.
 *   2. Extract productNumber from the URL (pattern: `.../-{productNumber}/`).
 *   3. Look up the row in `systembolaget_products` → get image_url base.
 *   4. Download `{image_url}.png` (full size, ~500 KB).
 *   5. Upload to Payload `media` (S3 + thumbnail generation).
 *   6. Patch `wines.image` to the new media id.
 *
 * Usage:
 *   pnpm backfill:wine-images                 # dry-run, preview matches
 *   pnpm backfill:wine-images --execute       # actually upload + link
 *   pnpm backfill:wine-images --limit=5       # cap rows for testing
 *
 * Idempotent — skips wines that already have an image. Reversible by clearing
 * `wines.image` (the uploaded media stays in the library; delete those manually
 * if you want to roll back fully).
 *
 * To target staging/prod, point DATABASE_URI at the Railway connection string:
 *   DATABASE_URI=postgres://... pnpm backfill:wine-images --execute
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

interface CliArgs {
  execute: boolean
  limit: number | null
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { execute: false, limit: null }
  for (const a of argv.slice(2)) {
    if (a === '--execute') args.execute = true
    else if (a.startsWith('--limit=')) args.limit = parseInt(a.slice('--limit='.length), 10)
    else if (a === '--help' || a === '-h') {
      console.log('Usage: pnpm backfill:wine-images [--execute] [--limit=N]')
      process.exit(0)
    }
  }
  return args
}

/**
 * Systembolaget product page URL pattern:
 *   https://www.systembolaget.se/produkt/{cat}/{slug}-{productNumber}/
 * The productNumber is the trailing digit run before the final slash.
 */
function extractProductNumber(url: string): string | null {
  const m = url.match(/-(\d+)\/?$/)
  return m ? m[1] : null
}

interface WineRow {
  id: number
  name: string
  winery: string | null
  vintage: number | null
  systembolaget_url: string
}

interface MatchResult {
  wine: WineRow
  productNumber: string
  systembolagetImageUrl: string // base URL without extension
  systembolagetName: string | null
}

interface SkipResult {
  wine: WineRow
  reason: string
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  console.log(
    `Mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}${args.limit ? ` (limit=${args.limit})` : ''}`,
  )

  const payload = await getPayload({ config })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool: {
    query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>
  } = (payload.db as any).pool

  // 1. Find candidates.
  const { rows: candidates } = await pool.query(`
    SELECT id, name, winery, vintage, systembolaget_url
    FROM wines
    WHERE image_id IS NULL
      AND systembolaget_url IS NOT NULL
      AND systembolaget_url <> ''
    ORDER BY id;
  `)

  console.log(`Found ${candidates.length} wines without image but with Systembolaget URL.`)

  // 2. Resolve each via productNumber → systembolaget_products lookup.
  const matches: MatchResult[] = []
  const skipped: SkipResult[] = []
  for (const w of candidates as WineRow[]) {
    const pn = extractProductNumber(w.systembolaget_url)
    if (!pn) {
      skipped.push({ wine: w, reason: 'could not extract productNumber from URL' })
      continue
    }
    const { rows } = await pool.query(
      `SELECT image_url, product_name_bold FROM systembolaget_products WHERE product_number = $1 LIMIT 1`,
      [pn],
    )
    if (rows.length === 0) {
      skipped.push({ wine: w, reason: `productNumber ${pn} not found in systembolaget_products` })
      continue
    }
    const imageUrl = rows[0].image_url
    if (!imageUrl) {
      skipped.push({ wine: w, reason: `productNumber ${pn} has no image_url upstream` })
      continue
    }
    matches.push({
      wine: w,
      productNumber: pn,
      systembolagetImageUrl: imageUrl,
      systembolagetName: rows[0].product_name_bold,
    })
  }

  console.log(`\nMatched: ${matches.length}`)
  console.log(`Skipped: ${skipped.length}\n`)

  if (skipped.length > 0) {
    console.log('=== Skipped ===')
    for (const s of skipped) {
      console.log(`  wine ${s.wine.id} (${s.wine.name}) — ${s.reason}`)
    }
    console.log()
  }

  if (matches.length === 0) {
    console.log('Nothing to do.')
    await pool.end()
    return
  }

  if (!args.execute) {
    console.log('=== Match preview (first 20) ===')
    for (const m of matches.slice(0, 20)) {
      console.log(
        `  wine ${m.wine.id} "${m.wine.name}" (${m.wine.winery || '?'}, ${m.wine.vintage || '—'})`,
      )
      console.log(
        `    → SB #${m.productNumber} "${m.systembolagetName || '?'}" → ${m.systembolagetImageUrl}.png`,
      )
    }
    if (matches.length > 20) console.log(`  … and ${matches.length - 20} more`)
    console.log('\nDry run — no uploads. Pass --execute to write.')
    return
  }

  // 3. Execute: download → Media → patch wines.image
  const limit = args.limit ?? matches.length
  const toProcess = matches.slice(0, limit)
  console.log(`Processing ${toProcess.length} wines …`)

  let okCount = 0
  let failCount = 0
  const t0 = Date.now()

  for (let i = 0; i < toProcess.length; i++) {
    const m = toProcess[i]
    const fullUrl = `${m.systembolagetImageUrl}.png`
    const prefix = `[${i + 1}/${toProcess.length}] wine ${m.wine.id} "${m.wine.name}"`
    try {
      // Download
      const res = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'vinakademin-wine-image-backfill (https://vinakademin.se)',
        },
      })
      if (!res.ok) {
        console.warn(`${prefix} — HTTP ${res.status} from ${fullUrl}`)
        failCount++
        continue
      }
      const arrayBuffer = await res.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Payload Media. Payload's Media collection runs the existing
      // S3 + sharp pipeline (alt text, thumbnail variants, dev/prod prefix).
      const media = await payload.create({
        collection: 'media',
        data: {
          alt: `${m.wine.name}${m.wine.vintage ? ` ${m.wine.vintage}` : ''}`,
        },
        file: {
          data: buffer,
          mimetype: 'image/png',
          name: `systembolaget-${m.productNumber}.png`,
          size: buffer.byteLength,
        },
        overrideAccess: true,
      })

      // Link on wines
      await payload.update({
        collection: 'wines',
        id: m.wine.id,
        data: { image: media.id },
        overrideAccess: true,
      })

      okCount++
      console.log(`${prefix} — linked media ${media.id} (${buffer.byteLength} bytes)`)
    } catch (err) {
      failCount++
      console.error(`${prefix} — failed: ${(err as Error).message}`)
    }
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\nDone in ${dt}s. ok=${okCount} failed=${failCount}`)
  await pool.end()
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
