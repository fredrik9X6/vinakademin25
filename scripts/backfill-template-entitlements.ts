/**
 * One-shot backfill: every user with an existing TastingPlan derived from a
 * (now-paid) template should retroactively get a TemplateEntitlements row so
 * they can re-clone, see the source template unlocked, etc.
 *
 * Per O-2 resolution: acquiredVia: 'admin_grant', no payment data.
 * Idempotent on the (user, template) unique index — safe to run multiple times.
 *
 * Run with `pnpm backfill-template-entitlements`.
 *
 * Spec: docs/superpowers/specs/2026-06-13-vinkurs-provning-product-split-design.md (D.6)
 */

import { config as loadDotenv } from 'dotenv'

// Load env before importing payload config (which evaluates process.env).
loadDotenv({ path: '.env.local' })
loadDotenv({ path: '.env' })

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })

  console.log('Finding existing tasting plans derived from templates…')
  const { docs: plans } = await payload.find({
    collection: 'tasting-plans',
    where: { derivedFromTemplate: { exists: true } },
    limit: 10_000,
    overrideAccess: true,
    depth: 0,
  })

  // Dedup by (owner, derivedFromTemplate)
  const pairs = new Map<string, { userId: number; templateId: number; createdAt: string }>()
  for (const plan of plans) {
    const ownerId =
      typeof plan.owner === 'object' && plan.owner ? (plan.owner as { id?: number }).id : (plan.owner as number | null)
    const templateId =
      typeof plan.derivedFromTemplate === 'object' && plan.derivedFromTemplate
        ? (plan.derivedFromTemplate as { id?: number }).id
        : (plan.derivedFromTemplate as number | null)
    if (!ownerId || !templateId) continue
    const key = `${ownerId}:${templateId}`
    if (!pairs.has(key)) {
      pairs.set(key, {
        userId: ownerId,
        templateId,
        createdAt: (plan.createdAt as string) || new Date().toISOString(),
      })
    }
  }
  console.log(`Found ${plans.length} plans → ${pairs.size} unique (user, template) pairs`)

  let created = 0
  let skipped = 0
  let failed = 0
  for (const { userId, templateId, createdAt } of pairs.values()) {
    try {
      const existing = await payload.find({
        collection: 'template-entitlements',
        where: {
          and: [
            { user: { equals: userId } },
            { template: { equals: templateId } },
          ],
        },
        limit: 1,
        overrideAccess: true,
      })
      if (existing.totalDocs > 0) {
        skipped += 1
        continue
      }
      await payload.create({
        collection: 'template-entitlements',
        data: {
          user: userId,
          template: templateId,
          status: 'active',
          acquiredVia: 'admin_grant',
          acquiredAt: createdAt,
        },
        overrideAccess: true,
      })
      created += 1
    } catch (err) {
      console.error(`Failed for (user=${userId}, template=${templateId}):`, err)
      failed += 1
    }
  }

  console.log(`Done. created=${created} skipped(existing)=${skipped} failed=${failed}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('backfill-template-entitlements failed:', err)
  process.exit(1)
})
