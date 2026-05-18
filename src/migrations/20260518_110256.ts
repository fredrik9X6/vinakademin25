import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasting_templates_wines_custom_wine_type" AS ENUM('red', 'white', 'rose', 'sparkling', 'dessert', 'fortified', 'other');
  ALTER TABLE "tasting_templates_wines" ALTER COLUMN "library_wine_id" DROP NOT NULL;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_name" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_producer" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_vintage" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_type" "enum_tasting_templates_wines_custom_wine_type";
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_systembolaget_url" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_price_sek" numeric;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_systembolaget_product_number" varchar;
  ALTER TABLE "tasting_templates_wines" ADD COLUMN "custom_wine_image_url" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates_wines" ALTER COLUMN "library_wine_id" SET NOT NULL;
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_name";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_producer";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_vintage";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_type";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_systembolaget_url";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_price_sek";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_systembolaget_product_number";
  ALTER TABLE "tasting_templates_wines" DROP COLUMN IF EXISTS "custom_wine_image_url";
  DROP TYPE "public"."enum_tasting_templates_wines_custom_wine_type";`)
}
