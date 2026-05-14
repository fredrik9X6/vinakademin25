import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "user_wines" ADD COLUMN "custom_wine_image_url" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_image_url" varchar;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "custom_wine_image_url" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_image_url";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_image_url";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "custom_wine_image_url";`)
}
