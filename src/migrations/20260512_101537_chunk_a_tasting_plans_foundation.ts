import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_tasting_plans_wines_custom_wine_type" AS ENUM('red', 'white', 'rose', 'sparkling', 'dessert', 'fortified', 'other');
  CREATE TYPE "public"."enum_tasting_plans_status" AS ENUM('draft', 'ready', 'archived');
  CREATE TABLE IF NOT EXISTS "tasting_plans_wines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"library_wine_id" integer,
  	"custom_wine_name" varchar,
  	"custom_wine_producer" varchar,
  	"custom_wine_vintage" varchar,
  	"custom_wine_type" "enum_tasting_plans_wines_custom_wine_type",
  	"custom_wine_systembolaget_url" varchar,
  	"custom_wine_price_sek" numeric,
  	"pour_order" numeric,
  	"host_notes" varchar
  );
  
  CREATE TABLE IF NOT EXISTS "tasting_plans" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"owner_id" integer NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"occasion" varchar,
  	"target_participants" numeric DEFAULT 4,
  	"host_script" varchar,
  	"status" "enum_tasting_plans_status" DEFAULT 'draft' NOT NULL,
  	"derived_from_template_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "user_wines" ALTER COLUMN "wine_id" DROP NOT NULL;
  ALTER TABLE "reviews" ALTER COLUMN "wine_id" DROP NOT NULL;
  ALTER TABLE "course_sessions" ALTER COLUMN "course_id" DROP NOT NULL;
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_name" varchar;
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_producer" varchar;
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_vintage" varchar;
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_type" varchar;
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_systembolaget_url" varchar;
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_price_sek" numeric;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_name" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_producer" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_vintage" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_type" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_systembolaget_url" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_price_sek" numeric;
  ALTER TABLE "course_sessions" ADD COLUMN "tasting_plan_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tasting_plans_id" integer;
  DO $$ BEGIN
   ALTER TABLE "tasting_plans_wines" ADD CONSTRAINT "tasting_plans_wines_library_wine_id_wines_id_fk" FOREIGN KEY ("library_wine_id") REFERENCES "public"."wines"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "tasting_plans_wines" ADD CONSTRAINT "tasting_plans_wines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tasting_plans"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "tasting_plans" ADD CONSTRAINT "tasting_plans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "tasting_plans" ADD CONSTRAINT "tasting_plans_derived_from_template_id_tasting_plans_id_fk" FOREIGN KEY ("derived_from_template_id") REFERENCES "public"."tasting_plans"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "tasting_plans_wines_order_idx" ON "tasting_plans_wines" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "tasting_plans_wines_parent_id_idx" ON "tasting_plans_wines" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "tasting_plans_wines_library_wine_idx" ON "tasting_plans_wines" USING btree ("library_wine_id");
  CREATE INDEX IF NOT EXISTS "tasting_plans_owner_idx" ON "tasting_plans" USING btree ("owner_id");
  CREATE INDEX IF NOT EXISTS "tasting_plans_derived_from_template_idx" ON "tasting_plans" USING btree ("derived_from_template_id");
  CREATE INDEX IF NOT EXISTS "tasting_plans_updated_at_idx" ON "tasting_plans" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "tasting_plans_created_at_idx" ON "tasting_plans" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "course_sessions" ADD CONSTRAINT "course_sessions_tasting_plan_id_tasting_plans_id_fk" FOREIGN KEY ("tasting_plan_id") REFERENCES "public"."tasting_plans"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tasting_plans_fk" FOREIGN KEY ("tasting_plans_id") REFERENCES "public"."tasting_plans"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "course_sessions_tasting_plan_idx" ON "course_sessions" USING btree ("tasting_plan_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tasting_plans_id_idx" ON "payload_locked_documents_rels" USING btree ("tasting_plans_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_plans_wines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "tasting_plans" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "tasting_plans_wines" CASCADE;
  DROP TABLE "tasting_plans" CASCADE;
  ALTER TABLE "course_sessions" DROP CONSTRAINT "course_sessions_tasting_plan_id_tasting_plans_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_tasting_plans_fk";
  
  DROP INDEX IF EXISTS "course_sessions_tasting_plan_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_tasting_plans_id_idx";
  ALTER TABLE "user_wines" ALTER COLUMN "wine_id" SET NOT NULL;
  ALTER TABLE "reviews" ALTER COLUMN "wine_id" SET NOT NULL;
  ALTER TABLE "course_sessions" ALTER COLUMN "course_id" SET NOT NULL;
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_name";
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_producer";
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_vintage";
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_type";
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_systembolaget_url";
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_price_sek";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_name";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_producer";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_vintage";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_type";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_systembolaget_url";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_price_sek";
  ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "tasting_plan_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "tasting_plans_id";
  DROP TYPE "public"."enum_tasting_plans_wines_custom_wine_type";
  DROP TYPE "public"."enum_tasting_plans_status";`)
}
