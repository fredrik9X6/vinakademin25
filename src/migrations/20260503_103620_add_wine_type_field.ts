import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_wines_type" AS ENUM('red', 'white', 'rose', 'sparkling', 'orange', 'fortified', 'dessert');
  ALTER TABLE "wines" ADD COLUMN "type" "enum_wines_type";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "wines" DROP COLUMN IF EXISTS "type";
  DROP TYPE "public"."enum_wines_type";`)
}
