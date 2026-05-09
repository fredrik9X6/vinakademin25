import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subscribers_lead_magnet_type" AS ENUM('ebook', 'quiz', 'webinar', 'video', 'download', 'template');
  ALTER TABLE "subscribers" ADD COLUMN "lead_magnet_type" "enum_subscribers_lead_magnet_type";
  ALTER TABLE "subscribers" ADD COLUMN "lead_magnet_slug" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "lead_magnet_type";
  ALTER TABLE "subscribers" DROP COLUMN IF EXISTS "lead_magnet_slug";
  DROP TYPE "public"."enum_subscribers_lead_magnet_type";`)
}
