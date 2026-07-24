import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasting_templates_wines_blind_answer_price_bucket" AS ENUM('0_99', '100_149', '150_199', '200_249', '250_299', '300_plus');
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "blind_answer_country" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "blind_answer_price_bucket" "enum_tasting_templates_wines_blind_answer_price_bucket";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "blind_answer_country";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "blind_answer_price_bucket";
  DROP TYPE "public"."enum_tasting_templates_wines_blind_answer_price_bucket";`)
}
