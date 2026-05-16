/**
 * Backfill the new `bottle` (200x400 portrait) Media size for wine library
 * images that were uploaded before the size was added to the collection.
 *
 * For each unique Media doc referenced by a Wine and missing `sizes.bottle.url`:
 *   1. Download the original file from the media's current `url`.
 *   2. Re-upload via payload.update({ file: {...} }) with the same filename
 *      so Payload re-runs sharp and stores every configured size, including
 *      `bottle`. The DB row keeps its id; sizes_bottle_* columns get filled.
 *
 * Dry-run by default — pass --execute to actually re-upload.
 *
 *   pnpm tsx --env-file=.env scripts/backfill-wine-bottle-sizes.ts
 *   pnpm tsx --env-file=.env scripts/backfill-wine-bottle-sizes.ts --execute
 *   pnpm tsx --env-file=.env scripts/backfill-wine-bottle-sizes.ts --execute --limit=5
 *
 * Idempotent: skips media docs that already have a bottle size. Safe to re-run
 * if interrupted.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Wine, Media } from '../src/payload-types'

interface CliArgs {
  execute: boolean
  force: boolean
  limit: number | null
  mediaBaseUrl: string
}

function parseArgs(argv: string[]): CliArgs {
  // media.url is computed at read time using the local server URL, which
  // points at localhost when the script runs from a dev terminal. Override
  // with the public host that actually serves /api/media/file/<filename>.
  const args: CliArgs = {
    execute: false,
    force: false,
    limit: null,
    mediaBaseUrl: 'https://vinakademin.se',
  }
  for (const a of argv.slice(2)) {
    if (a === '--execute') args.execute = true
    else if (a === '--force') args.force = true
    else if (a.startsWith('--limit=')) args.limit = parseInt(a.slice('--limit='.length), 10)
    else if (a.startsWith('--media-base-url=')) args.mediaBaseUrl = a.slice('--media-base-url='.length)
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: pnpm tsx scripts/backfill-wine-bottle-sizes.ts [--execute] [--force] [--limit=N] [--media-base-url=https://vinakademin.se]',
      )
      console.log('  --force  re-upload every media doc even if it already has a bottle url (use after changing imageSize config)')
      process.exit(0)
    }
  }
  return args
}

function buildFetchUrl(filename: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/media/file/${encodeURIComponent(filename)}`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  console.log(
    `Mode: ${args.execute ? 'EXECUTE' : 'DRY-RUN'}${args.limit ? ` (limit=${args.limit})` : ''}`,
  )

  const payload = await getPayload({ config })

  // 1. Get every wine with an image, then dedupe to the unique media ids.
  //    A wine's `image` is a relation; depth:1 gives us the resolved Media doc.
  const winesRes = await payload.find({
    collection: 'wines',
    where: { image: { exists: true } },
    limit: 5000,
    depth: 1,
    overrideAccess: true,
  })

  const mediaById = new Map<number, Media>()
  for (const w of winesRes.docs as Wine[]) {
    const img = w.image
    if (typeof img === 'object' && img && typeof img.id === 'number') {
      mediaById.set(img.id, img as Media)
    }
  }

  console.log(`Wines with image: ${winesRes.docs.length}`)
  console.log(`Unique media docs: ${mediaById.size}`)

  // 2. Filter to those missing the bottle size (unless --force, in which case
  //    we re-process everything to pick up imageSize config changes).
  const needsBackfill: Media[] = []
  for (const m of mediaById.values()) {
    const hasBottle = !!m.sizes?.bottle?.url
    if (args.force || !hasBottle) needsBackfill.push(m)
  }
  if (args.force) {
    console.log(`Force mode — re-uploading all ${mediaById.size} media docs\n`)
  } else {
    console.log(`Already have bottle size: ${mediaById.size - needsBackfill.length}`)
    console.log(`Need backfill: ${needsBackfill.length}\n`)
  }

  if (needsBackfill.length === 0) {
    console.log('Nothing to do. ✓')
    return
  }

  if (!args.execute) {
    console.log('=== Preview (first 20) ===')
    for (const m of needsBackfill.slice(0, 20)) {
      const src = m.filename ? buildFetchUrl(m.filename, args.mediaBaseUrl) : '(no filename)'
      console.log(`  media ${m.id} — ${m.filename || '(no filename)'}  fetch=${src}`)
    }
    if (needsBackfill.length > 20) console.log(`  … and ${needsBackfill.length - 20} more`)
    console.log(`\nFetch base: ${args.mediaBaseUrl} (override with --media-base-url=...)`)
    console.log('Dry run. Pass --execute to actually re-upload.')
    return
  }

  // 3. Execute.
  const limit = args.limit ?? needsBackfill.length
  const toProcess = needsBackfill.slice(0, limit)
  console.log(`Processing ${toProcess.length} media docs …`)

  let okCount = 0
  let failCount = 0
  const t0 = Date.now()

  for (let i = 0; i < toProcess.length; i++) {
    const m = toProcess[i]
    const prefix = `[${i + 1}/${toProcess.length}] media ${m.id} "${m.filename ?? '?'}"`
    if (!m.filename) {
      console.warn(`${prefix} — skipped (no filename)`)
      failCount++
      continue
    }
    const fetchUrl = buildFetchUrl(m.filename, args.mediaBaseUrl)
    try {
      const res = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'vinakademin-bottle-size-backfill (https://vinakademin.se)',
        },
      })
      if (!res.ok) {
        console.warn(`${prefix} — HTTP ${res.status} from ${fetchUrl}`)
        failCount++
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())

      // Re-upload via payload.update with the file payload. Payload re-runs
      // sharp and writes every configured size, including the new bottle one.
      await payload.update({
        collection: 'media',
        id: m.id,
        data: {},
        file: {
          data: buf,
          mimetype: m.mimeType || 'image/png',
          name: m.filename || `media-${m.id}.png`,
          size: buf.byteLength,
        },
        overrideAccess: true,
      })

      okCount++
      console.log(`${prefix} — re-uploaded (${buf.byteLength} bytes)`)
    } catch (err) {
      failCount++
      console.error(`${prefix} — failed: ${(err as Error).message}`)
    }
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1)
  console.log(`\nDone in ${dt}s. ok=${okCount} failed=${failCount}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
