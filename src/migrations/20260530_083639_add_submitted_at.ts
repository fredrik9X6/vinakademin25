import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Additive: add nullable `submitted_at` to session_guesses and reviews.
 * NULL = draft / autosaved; set = "locked in". Does NOT gate recap inclusion.
 * (The price-enum change lives in a separate Workstream C migration.)
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "session_guesses" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp(3) with time zone;
    ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "submitted_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "session_guesses_submitted_at_idx" ON "session_guesses" USING btree ("submitted_at");
    CREATE INDEX IF NOT EXISTS "reviews_submitted_at_idx" ON "reviews" USING btree ("submitted_at");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "session_guesses_submitted_at_idx";
    DROP INDEX IF EXISTS "reviews_submitted_at_idx";
    ALTER TABLE "session_guesses" DROP COLUMN IF EXISTS "submitted_at";
    ALTER TABLE "reviews" DROP COLUMN IF EXISTS "submitted_at";
  `)
}
