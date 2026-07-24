import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { fillBlindAnswersFromSystembolaget } from '../lib/systembolaget-blind-answers'
import type { TastingPlan } from '../payload-types'

/**
 * Data backfill: derive blindAnswerCountry / blindAnswerGrapes for every
 * template + plan wine that is a Systembolaget snapshot (customWine with a
 * product number) and has empty answer fields, using the
 * `systembolaget_products` catalog.
 *
 * Idempotent: only empty fields are filled; host/author-set values are never
 * overwritten. Environments without catalog data simply no-op. Going forward
 * the same fill runs as a beforeChange hook on both collections — this
 * migration covers documents authored before that hook existed.
 */

const COLLECTIONS = ['tasting-templates', 'tasting-plans'] as const

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  for (const collection of COLLECTIONS) {
    let page = 1
    let updated = 0
    for (;;) {
      const res = await payload.find({
        collection,
        limit: 100,
        page,
        depth: 0,
        overrideAccess: true,
      })
      for (const doc of res.docs as Array<{ id: number; wines?: unknown[] }>) {
        const wines = doc.wines
        if (!Array.isArray(wines) || wines.length === 0) continue
        const { changed, wines: filled } = await fillBlindAnswersFromSystembolaget(
          payload,
          wines as Parameters<typeof fillBlindAnswersFromSystembolaget>[1],
        )
        if (!changed) continue
        // Both collections share the same wines-entry shape for this update;
        // the cast collapses the union slug so the generic overload resolves.
        await payload.update({
          collection: collection as 'tasting-plans',
          id: doc.id,
          data: { wines: filled as unknown as TastingPlan['wines'] },
          overrideAccess: true,
        })
        updated++
      }
      if (!res.hasNextPage) break
      page++
    }
    payload.logger.info(`backfill blind answers: ${collection} — ${updated} docs updated`)
  }
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Data backfill — intentionally irreversible (only filled empty fields).
}
