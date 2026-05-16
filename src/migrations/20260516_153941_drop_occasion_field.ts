import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_plans" DROP COLUMN IF EXISTS "occasion";
  ALTER TABLE "tasting_templates" DROP COLUMN IF EXISTS "occasion";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_plans" ADD COLUMN "occasion" varchar;
  ALTER TABLE "tasting_templates" ADD COLUMN "occasion" varchar;`)
}
