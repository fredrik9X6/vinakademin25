import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // `reviews.buy_again` already exists on both production and staging (an
  // orphaned column from an earlier PAYLOAD_DB_PUSH=true run that was never
  // captured in a migration). Drizzle's diff has no record of it, so it emits
  // a bare ADD COLUMN here — that would fail with "column already exists" on
  // every database that has it. IF NOT EXISTS makes this a harmless no-op
  // there, while remaining correct on any database that genuinely lacks it.
  await db.execute(sql`
   ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "buy_again" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reviews" DROP COLUMN IF EXISTS "buy_again";`)
}
