import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasting_templates_published_status" AS ENUM('draft', 'published');
  CREATE TABLE IF NOT EXISTS "tasting_templates_wines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"library_wine_id" integer NOT NULL,
  	"pour_order" numeric,
  	"host_notes" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "tasting_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"occasion" varchar,
  	"target_participants" numeric DEFAULT 4,
  	"host_script" varchar,
  	"featured_image_id" integer,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"published_status" "enum_tasting_templates_published_status" DEFAULT 'draft' NOT NULL,
  	"published_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tasting_plans" DROP CONSTRAINT "tasting_plans_derived_from_template_id_tasting_plans_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tasting_templates_id" integer;
  DO $$ BEGIN
   ALTER TABLE "tasting_templates_wines" ADD CONSTRAINT "tasting_templates_wines_library_wine_id_wines_id_fk" FOREIGN KEY ("library_wine_id") REFERENCES "public"."wines"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "tasting_templates_wines" ADD CONSTRAINT "tasting_templates_wines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tasting_templates"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "tasting_templates" ADD CONSTRAINT "tasting_templates_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "tasting_templates_wines_order_idx" ON "tasting_templates_wines" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "tasting_templates_wines_parent_id_idx" ON "tasting_templates_wines" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "tasting_templates_wines_library_wine_idx" ON "tasting_templates_wines" USING btree ("library_wine_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "tasting_templates_slug_idx" ON "tasting_templates" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "tasting_templates_featured_image_idx" ON "tasting_templates" USING btree ("featured_image_id");
  CREATE INDEX IF NOT EXISTS "tasting_templates_updated_at_idx" ON "tasting_templates" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tasting_templates_created_at_idx" ON "tasting_templates" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "tasting_plans" ADD CONSTRAINT "tasting_plans_derived_from_template_id_tasting_templates_id_fk" FOREIGN KEY ("derived_from_template_id") REFERENCES "public"."tasting_templates"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tasting_templates_fk" FOREIGN KEY ("tasting_templates_id") REFERENCES "public"."tasting_templates"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tasting_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("tasting_templates_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates_wines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tasting_templates" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tasting_templates_wines" CASCADE;
  DROP TABLE "tasting_templates" CASCADE;
  ALTER TABLE "tasting_plans" DROP CONSTRAINT "tasting_plans_derived_from_template_id_tasting_templates_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tasting_templates_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_tasting_templates_id_idx";
  DO $$ BEGIN
   ALTER TABLE "tasting_plans" ADD CONSTRAINT "tasting_plans_derived_from_template_id_tasting_plans_id_fk" FOREIGN KEY ("derived_from_template_id") REFERENCES "public"."tasting_plans"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "tasting_templates_id";
  DROP TYPE "public"."enum_tasting_templates_published_status";`)
}
