import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "tasting_templates_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "users" ADD COLUMN "handle" varchar;
  ALTER TABLE "tasting_plans" ADD COLUMN "published_to_profile" boolean DEFAULT false;
  DO $$ BEGIN
   ALTER TABLE "tasting_templates_texts" ADD CONSTRAINT "tasting_templates_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasting_templates"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "tasting_templates_texts_order_parent_idx" ON "tasting_templates_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "users_handle_idx" ON "users" USING btree ("handle");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tasting_templates_texts" CASCADE;
  DROP INDEX IF EXISTS "users_handle_idx";
  ALTER TABLE "users" DROP COLUMN IF EXISTS "handle";
  ALTER TABLE "tasting_plans" DROP COLUMN IF EXISTS "published_to_profile";`)
}
