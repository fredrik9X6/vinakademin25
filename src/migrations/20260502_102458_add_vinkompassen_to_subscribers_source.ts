import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_subscribers_source" ADD VALUE 'vinkompassen';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "public"."subscribers" ALTER COLUMN "source" SET DATA TYPE text;
  DROP TYPE "public"."enum_subscribers_source";
  CREATE TYPE "public"."enum_subscribers_source" AS ENUM('footer', 'newsletter_page', 'registration', 'onboarding', 'profile', 'manual');
  ALTER TABLE "public"."subscribers" ALTER COLUMN "source" SET DATA TYPE "public"."enum_subscribers_source" USING "source"::"public"."enum_subscribers_source";`)
}
