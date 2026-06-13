/**
 * Rewrite every existing Media row's `url` and `sizes.*.url` to point at the
 * Cloudflare R2 custom domain instead of the legacy `/api/media/file/*` proxy.
 *
 * Why this is needed:
 *   Payload's @payloadcms/storage-s3 plugin persists the URL at upload time —
 *   it's not recomputed on read. So setting `S3_PUBLIC_URL` only fixes
 *   forward: every new upload gets a CDN URL, every existing row still
 *   points at the proxy. This script migrates the historic rows.
 *
 * Pre-requisites:
 *   - S3_PUBLIC_URL must be set in the env this script runs against
 *     (e.g. `S3_PUBLIC_URL=https://media.vinakademin.se` in `.env`)
 *   - The R2 bucket must already be reachable on that custom domain
 *
 * Idempotent on the (url, sizes.*.url) shape: if a row already points at
 * S3_PUBLIC_URL we leave it alone. Safe to re-run.
 *
 * Run with `pnpm backfill-media-urls`.
 *
 * Spec reference: project_media_r2_proxy_hang memory + 2026-06-13 fix.
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

const PUBLIC_URL = process.env.S3_PUBLIC_URL?.replace(/\/$/, '')
const BUCKET = process.env.S3_BUCKET
const PREFIX =
  process.env.S3_PREFIX || (process.env.NODE_ENV === 'development' ? 'dev' : 'production')
// FORCE=1 re-writes URLs even when the current doc.url already matches the
// target — useful when Payload's on-read URL rewrite hides DB inconsistency
// from the equality check.
const FORCE = process.env.FORCE === '1' || process.env.FORCE === 'true'

if (!PUBLIC_URL) {
  console.error(
    'ERROR: S3_PUBLIC_URL is not set. Add it to .env (or your shell) before running this script.\n' +
      '       Example: S3_PUBLIC_URL=https://media.vinakademin.se',
  )
  process.exit(1)
}

if (!BUCKET) {
  console.error(
    'ERROR: S3_BUCKET is not set. The bucket name must be spliced into the URL because\n' +
      '       S3_ENDPOINT already includes /<bucket> AND forcePathStyle is true,\n' +
      '       so every object key in R2 is `<bucket>/<prefix>/<filename>`.',
  )
  process.exit(1)
}

function cdnUrl(filename: string): string {
  return `${PUBLIC_URL}/${BUCKET}/${PREFIX}/${filename}`
}

async function main() {
  const payload = await getPayload({ config })

  console.log(`Backfilling Media URLs to ${PUBLIC_URL}/${PREFIX}/…`)

  const all = await payload.find({
    collection: 'media',
    limit: 10_000,
    depth: 0,
    overrideAccess: true,
  })

  console.log(`Found ${all.totalDocs} media docs`)

  let updated = 0
  let skipped = 0
  let nofilename = 0
  let failed = 0

  for (const doc of all.docs) {
    try {
      const filename = (doc as { filename?: string | null }).filename
      if (!filename) {
        nofilename += 1
        continue
      }

      const targetUrl = cdnUrl(filename)
      const currentUrl = (doc as { url?: string | null }).url
      const sizes = (doc as { sizes?: Record<string, { filename?: string | null; url?: string | null }> })
        .sizes as Record<string, { filename?: string | null; url?: string | null }> | undefined

      // Compute the size-variant URL updates we need
      const sizeUpdates: Record<string, { url: string }> = {}
      if (sizes) {
        for (const [sizeName, variant] of Object.entries(sizes)) {
          if (!variant) continue
          const variantFilename = variant.filename
          if (!variantFilename) continue
          const targetVariantUrl = cdnUrl(variantFilename)
          if (variant.url !== targetVariantUrl) {
            sizeUpdates[sizeName] = { url: targetVariantUrl }
          }
        }
      }

      const needsTopLevelUpdate = FORCE || currentUrl !== targetUrl
      const needsSizeUpdate = FORCE || Object.keys(sizeUpdates).length > 0

      if (!needsTopLevelUpdate && !needsSizeUpdate) {
        skipped += 1
        continue
      }

      if (FORCE) {
        // Ensure every size variant gets re-written too, not just the diff.
        if (sizes) {
          for (const [sizeName, variant] of Object.entries(sizes)) {
            if (!variant?.filename) continue
            sizeUpdates[sizeName] = { url: cdnUrl(variant.filename) }
          }
        }
      }

      const data: Record<string, unknown> = {}
      if (needsTopLevelUpdate) data.url = targetUrl
      if (needsSizeUpdate) {
        // Merge with existing sizes so we don't drop variants we're not
        // touching (e.g. if a size's filename is null we leave it alone).
        const merged: Record<string, { url?: string; filename?: string | null }> = {}
        if (sizes) {
          for (const [k, v] of Object.entries(sizes)) {
            merged[k] = { ...v }
          }
        }
        for (const [k, v] of Object.entries(sizeUpdates)) {
          merged[k] = { ...merged[k], url: v.url }
        }
        data.sizes = merged
      }

      await payload.update({
        collection: 'media',
        id: doc.id,
        data,
        overrideAccess: true,
      })
      updated += 1
      if (updated % 25 === 0) {
        console.log(`  … updated ${updated} so far`)
      }
    } catch (err) {
      failed += 1
      console.error(`Failed for media id=${doc.id}:`, err)
    }
  }

  console.log(
    `\nDone. updated=${updated} skipped(already-cdn)=${skipped} no-filename=${nofilename} failed=${failed}`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('backfill-media-urls-to-cdn failed:', err)
  process.exit(1)
})
