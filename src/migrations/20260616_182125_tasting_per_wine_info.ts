import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_plans_wines" ADD COLUMN "abv" numeric;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "serving_temp" varchar;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "guest_description" varchar;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "food_pairing" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "abv" numeric;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "serving_temp" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "guest_description" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "food_pairing" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "abv";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "serving_temp";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "guest_description";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "food_pairing";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "abv";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "serving_temp";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "guest_description";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "food_pairing";`)
}
