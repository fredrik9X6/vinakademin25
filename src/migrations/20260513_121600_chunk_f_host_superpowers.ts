import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_sessions" ADD COLUMN "blind_tasting" boolean DEFAULT false;
  ALTER TABLE "course_sessions" ADD COLUMN "revealed_pour_orders" jsonb DEFAULT '[]'::jsonb;
  ALTER TABLE "course_sessions" ADD COLUMN "current_wine_focus_started_at" timestamp(3) with time zone;
  ALTER TABLE "tasting_plans" ADD COLUMN "blind_tasting_by_default" boolean DEFAULT false;
  ALTER TABLE "tasting_plans" ADD COLUMN "default_minutes_per_wine" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "blind_tasting";
  ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "revealed_pour_orders";
  ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "current_wine_focus_started_at";
  ALTER TABLE "tasting_plans" DROP COLUMN IF EXISTS "blind_tasting_by_default";
  ALTER TABLE "tasting_plans" DROP COLUMN IF EXISTS "default_minutes_per_wine";`)
}
