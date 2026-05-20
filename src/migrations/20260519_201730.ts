import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_wine_clubs_members_role" AS ENUM('owner', 'admin', 'member');
  CREATE TYPE "public"."enum_blind_battles_theme_wine_type" AS ENUM('any', 'red', 'white', 'rose', 'sparkling', 'orange', 'dessert');
  CREATE TYPE "public"."enum_blind_battles_status" AS ENUM('draft', 'submissions_open', 'in_session', 'completed', 'canceled');
  CREATE TYPE "public"."enum_blind_battles_reveal_strategy" AS ENUM('one_by_one', 'all_at_end');
  CREATE TYPE "public"."enum_blind_battle_submissions_custom_wine_type" AS ENUM('red', 'white', 'rose', 'sparkling', 'orange', 'dessert');
  CREATE TYPE "public"."enum_blind_battle_submissions_status" AS ENUM('invited', 'submitted', 'declined', 'no_show');
  CREATE TABLE IF NOT EXISTS "wine_clubs_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"role" "enum_wine_clubs_members_role" DEFAULT 'member' NOT NULL,
  	"joined_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "wine_clubs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"cover_image_id" integer,
  	"invite_code" varchar NOT NULL,
  	"owner_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "blind_battles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"theme_wine_type" "enum_blind_battles_theme_wine_type" DEFAULT 'any' NOT NULL,
  	"theme_price_min_sek" numeric,
  	"theme_price_max_sek" numeric,
  	"theme_description" varchar,
  	"host_id" integer NOT NULL,
  	"club_id" integer,
  	"status" "enum_blind_battles_status" DEFAULT 'draft' NOT NULL,
  	"submission_deadline" timestamp(3) with time zone,
  	"session_date" timestamp(3) with time zone,
  	"wine_count" numeric,
  	"reveal_strategy" "enum_blind_battles_reveal_strategy" DEFAULT 'all_at_end' NOT NULL,
  	"invite_code" varchar NOT NULL,
  	"current_session_id" integer,
  	"reminders_sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "blind_battles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"countries_id" integer,
  	"grapes_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "blind_battle_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"battle_id" integer NOT NULL,
  	"user_id" integer,
  	"guest_email" varchar,
  	"guest_name" varchar,
  	"systembolaget_product_id" integer,
  	"custom_wine_name" varchar,
  	"custom_wine_producer" varchar,
  	"custom_wine_vintage" varchar,
  	"custom_wine_type" "enum_blind_battle_submissions_custom_wine_type",
  	"custom_wine_price_sek" numeric,
  	"custom_wine_systembolaget_url" varchar,
  	"custom_wine_image_url" varchar,
  	"pour_order" numeric,
  	"submitted_at" timestamp(3) with time zone,
  	"revealed_at" timestamp(3) with time zone,
  	"status" "enum_blind_battle_submissions_status" DEFAULT 'invited' NOT NULL,
  	"submission_token" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "wine_clubs_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blind_battles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blind_battle_submissions_id" integer;
  DO $$ BEGIN
   ALTER TABLE "wine_clubs_members" ADD CONSTRAINT "wine_clubs_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wine_clubs_members" ADD CONSTRAINT "wine_clubs_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."wine_clubs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wine_clubs" ADD CONSTRAINT "wine_clubs_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "wine_clubs" ADD CONSTRAINT "wine_clubs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battles" ADD CONSTRAINT "blind_battles_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battles" ADD CONSTRAINT "blind_battles_club_id_wine_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."wine_clubs"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battles" ADD CONSTRAINT "blind_battles_current_session_id_course_sessions_id_fk" FOREIGN KEY ("current_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battles_rels" ADD CONSTRAINT "blind_battles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blind_battles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battles_rels" ADD CONSTRAINT "blind_battles_rels_countries_fk" FOREIGN KEY ("countries_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battles_rels" ADD CONSTRAINT "blind_battles_rels_grapes_fk" FOREIGN KEY ("grapes_id") REFERENCES "public"."grapes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battle_submissions" ADD CONSTRAINT "blind_battle_submissions_battle_id_blind_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."blind_battles"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battle_submissions" ADD CONSTRAINT "blind_battle_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "blind_battle_submissions" ADD CONSTRAINT "blind_battle_submissions_systembolaget_product_id_systembolaget_products_id_fk" FOREIGN KEY ("systembolaget_product_id") REFERENCES "public"."systembolaget_products"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "wine_clubs_members_order_idx" ON "wine_clubs_members" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "wine_clubs_members_parent_id_idx" ON "wine_clubs_members" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "wine_clubs_members_user_idx" ON "wine_clubs_members" USING btree ("user_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "wine_clubs_slug_idx" ON "wine_clubs" USING btree ("slug");
  CREATE INDEX IF NOT EXISTS "wine_clubs_cover_image_idx" ON "wine_clubs" USING btree ("cover_image_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "wine_clubs_invite_code_idx" ON "wine_clubs" USING btree ("invite_code");
  CREATE INDEX IF NOT EXISTS "wine_clubs_owner_idx" ON "wine_clubs" USING btree ("owner_id");
  CREATE INDEX IF NOT EXISTS "wine_clubs_updated_at_idx" ON "wine_clubs" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "wine_clubs_created_at_idx" ON "wine_clubs" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "blind_battles_host_idx" ON "blind_battles" USING btree ("host_id");
  CREATE INDEX IF NOT EXISTS "blind_battles_club_idx" ON "blind_battles" USING btree ("club_id");
  CREATE INDEX IF NOT EXISTS "blind_battles_status_idx" ON "blind_battles" USING btree ("status");
  CREATE UNIQUE INDEX IF NOT EXISTS "blind_battles_invite_code_idx" ON "blind_battles" USING btree ("invite_code");
  CREATE INDEX IF NOT EXISTS "blind_battles_current_session_idx" ON "blind_battles" USING btree ("current_session_id");
  CREATE INDEX IF NOT EXISTS "blind_battles_updated_at_idx" ON "blind_battles" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blind_battles_created_at_idx" ON "blind_battles" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "blind_battles_rels_order_idx" ON "blind_battles_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "blind_battles_rels_parent_idx" ON "blind_battles_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "blind_battles_rels_path_idx" ON "blind_battles_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "blind_battles_rels_countries_id_idx" ON "blind_battles_rels" USING btree ("countries_id");
  CREATE INDEX IF NOT EXISTS "blind_battles_rels_grapes_id_idx" ON "blind_battles_rels" USING btree ("grapes_id");
  CREATE INDEX IF NOT EXISTS "blind_battle_submissions_battle_idx" ON "blind_battle_submissions" USING btree ("battle_id");
  CREATE INDEX IF NOT EXISTS "blind_battle_submissions_user_idx" ON "blind_battle_submissions" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "blind_battle_submissions_systembolaget_product_idx" ON "blind_battle_submissions" USING btree ("systembolaget_product_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "blind_battle_submissions_submission_token_idx" ON "blind_battle_submissions" USING btree ("submission_token");
  CREATE INDEX IF NOT EXISTS "blind_battle_submissions_updated_at_idx" ON "blind_battle_submissions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "blind_battle_submissions_created_at_idx" ON "blind_battle_submissions" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_wine_clubs_fk" FOREIGN KEY ("wine_clubs_id") REFERENCES "public"."wine_clubs"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blind_battles_fk" FOREIGN KEY ("blind_battles_id") REFERENCES "public"."blind_battles"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blind_battle_submissions_fk" FOREIGN KEY ("blind_battle_submissions_id") REFERENCES "public"."blind_battle_submissions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_wine_clubs_id_idx" ON "payload_locked_documents_rels" USING btree ("wine_clubs_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blind_battles_id_idx" ON "payload_locked_documents_rels" USING btree ("blind_battles_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_blind_battle_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("blind_battle_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "wine_clubs_members" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "wine_clubs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blind_battles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blind_battles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "blind_battle_submissions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "wine_clubs_members" CASCADE;
  DROP TABLE "wine_clubs" CASCADE;
  DROP TABLE "blind_battles" CASCADE;
  DROP TABLE "blind_battles_rels" CASCADE;
  DROP TABLE "blind_battle_submissions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_wine_clubs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blind_battles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blind_battle_submissions_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_wine_clubs_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_blind_battles_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_blind_battle_submissions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "wine_clubs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "blind_battles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "blind_battle_submissions_id";
  DROP TYPE "public"."enum_wine_clubs_members_role";
  DROP TYPE "public"."enum_blind_battles_theme_wine_type";
  DROP TYPE "public"."enum_blind_battles_status";
  DROP TYPE "public"."enum_blind_battles_reveal_strategy";
  DROP TYPE "public"."enum_blind_battle_submissions_custom_wine_type";
  DROP TYPE "public"."enum_blind_battle_submissions_status";`)
}
