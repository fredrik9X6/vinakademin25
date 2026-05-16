import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "sizes_bottle_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_bottle_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_bottle_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_bottle_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_bottle_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_bottle_filename" varchar;
  CREATE INDEX IF NOT EXISTS "media_sizes_bottle_sizes_bottle_filename_idx" ON "media" USING btree ("sizes_bottle_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "media_sizes_bottle_sizes_bottle_filename_idx";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_bottle_url";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_bottle_width";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_bottle_height";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_bottle_mime_type";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_bottle_filesize";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_bottle_filename";`)
}
