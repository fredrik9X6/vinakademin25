import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasting_templates_access_level" AS ENUM('free', 'members_only');
  ALTER TABLE "tasting_templates" ADD COLUMN "access_level" "enum_tasting_templates_access_level" DEFAULT 'free' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates" DROP COLUMN IF EXISTS "access_level";
  DROP TYPE "public"."enum_tasting_templates_access_level";`)
}
