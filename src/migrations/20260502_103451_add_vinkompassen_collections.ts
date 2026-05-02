import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_vinkompass_archetypes_key" AS ENUM('light-classic', 'light-adventurous', 'bold-classic', 'bold-adventurous');
  CREATE TABLE IF NOT EXISTS "vinkompass_questions_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"image_id" integer,
  	"score_body" numeric NOT NULL,
  	"score_comfort" numeric NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "vinkompass_questions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric NOT NULL,
  	"question" varchar NOT NULL,
  	"helper_text" varchar,
  	"image_id" integer,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "vinkompass_archetypes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" "enum_vinkompass_archetypes_key" NOT NULL,
  	"name" varchar NOT NULL,
  	"tagline" varchar NOT NULL,
  	"description" jsonb NOT NULL,
  	"hero_image_id" integer,
  	"recommended_vinprovning_id" integer,
  	"beehiiv_tag" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "vinkompass_archetypes_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"wines_id" integer
  );
  
  CREATE TABLE IF NOT EXISTS "vinkompass_attempts_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question_id_id" integer NOT NULL,
  	"answer_index" numeric NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "vinkompass_attempts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"attempt_id" varchar NOT NULL,
  	"score_body" numeric NOT NULL,
  	"score_comfort" numeric NOT NULL,
  	"archetype_id" integer NOT NULL,
  	"email" varchar,
  	"email_submitted_at" timestamp(3) with time zone,
  	"subscriber_id_id" integer,
  	"user_id_id" integer,
  	"user_agent" varchar,
  	"referer" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vinkompass_questions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vinkompass_archetypes_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vinkompass_attempts_id" integer;
  DO $$ BEGIN
   ALTER TABLE "vinkompass_questions_answers" ADD CONSTRAINT "vinkompass_questions_answers_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_questions_answers" ADD CONSTRAINT "vinkompass_questions_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vinkompass_questions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_questions" ADD CONSTRAINT "vinkompass_questions_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_archetypes" ADD CONSTRAINT "vinkompass_archetypes_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_archetypes" ADD CONSTRAINT "vinkompass_archetypes_recommended_vinprovning_id_vinprovningar_id_fk" FOREIGN KEY ("recommended_vinprovning_id") REFERENCES "public"."vinprovningar"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_archetypes_rels" ADD CONSTRAINT "vinkompass_archetypes_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vinkompass_archetypes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_archetypes_rels" ADD CONSTRAINT "vinkompass_archetypes_rels_wines_fk" FOREIGN KEY ("wines_id") REFERENCES "public"."wines"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_attempts_answers" ADD CONSTRAINT "vinkompass_attempts_answers_question_id_id_vinkompass_questions_id_fk" FOREIGN KEY ("question_id_id") REFERENCES "public"."vinkompass_questions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_attempts_answers" ADD CONSTRAINT "vinkompass_attempts_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vinkompass_attempts"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_attempts" ADD CONSTRAINT "vinkompass_attempts_archetype_id_vinkompass_archetypes_id_fk" FOREIGN KEY ("archetype_id") REFERENCES "public"."vinkompass_archetypes"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_attempts" ADD CONSTRAINT "vinkompass_attempts_subscriber_id_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "vinkompass_attempts" ADD CONSTRAINT "vinkompass_attempts_user_id_id_users_id_fk" FOREIGN KEY ("user_id_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_answers_order_idx" ON "vinkompass_questions_answers" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_answers_parent_id_idx" ON "vinkompass_questions_answers" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_answers_image_idx" ON "vinkompass_questions_answers" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_order_idx" ON "vinkompass_questions" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_image_idx" ON "vinkompass_questions" USING btree ("image_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_updated_at_idx" ON "vinkompass_questions" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "vinkompass_questions_created_at_idx" ON "vinkompass_questions" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "vinkompass_archetypes_key_idx" ON "vinkompass_archetypes" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_hero_image_idx" ON "vinkompass_archetypes" USING btree ("hero_image_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_recommended_vinprovning_idx" ON "vinkompass_archetypes" USING btree ("recommended_vinprovning_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_updated_at_idx" ON "vinkompass_archetypes" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_created_at_idx" ON "vinkompass_archetypes" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_rels_order_idx" ON "vinkompass_archetypes_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_rels_parent_idx" ON "vinkompass_archetypes_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_rels_path_idx" ON "vinkompass_archetypes_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "vinkompass_archetypes_rels_wines_id_idx" ON "vinkompass_archetypes_rels" USING btree ("wines_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_answers_order_idx" ON "vinkompass_attempts_answers" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_answers_parent_id_idx" ON "vinkompass_attempts_answers" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_answers_question_id_idx" ON "vinkompass_attempts_answers" USING btree ("question_id_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "vinkompass_attempts_attempt_id_idx" ON "vinkompass_attempts" USING btree ("attempt_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_archetype_idx" ON "vinkompass_attempts" USING btree ("archetype_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_subscriber_id_idx" ON "vinkompass_attempts" USING btree ("subscriber_id_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_user_id_idx" ON "vinkompass_attempts" USING btree ("user_id_id");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_updated_at_idx" ON "vinkompass_attempts" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "vinkompass_attempts_created_at_idx" ON "vinkompass_attempts" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vinkompass_questions_fk" FOREIGN KEY ("vinkompass_questions_id") REFERENCES "public"."vinkompass_questions"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vinkompass_archetypes_fk" FOREIGN KEY ("vinkompass_archetypes_id") REFERENCES "public"."vinkompass_archetypes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vinkompass_attempts_fk" FOREIGN KEY ("vinkompass_attempts_id") REFERENCES "public"."vinkompass_attempts"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vinkompass_questions_id_idx" ON "payload_locked_documents_rels" USING btree ("vinkompass_questions_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vinkompass_archetypes_id_idx" ON "payload_locked_documents_rels" USING btree ("vinkompass_archetypes_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_vinkompass_attempts_id_idx" ON "payload_locked_documents_rels" USING btree ("vinkompass_attempts_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "vinkompass_questions_answers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vinkompass_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vinkompass_archetypes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vinkompass_archetypes_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vinkompass_attempts_answers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vinkompass_attempts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "vinkompass_questions_answers" CASCADE;
  DROP TABLE "vinkompass_questions" CASCADE;
  DROP TABLE "vinkompass_archetypes" CASCADE;
  DROP TABLE "vinkompass_archetypes_rels" CASCADE;
  DROP TABLE "vinkompass_attempts_answers" CASCADE;
  DROP TABLE "vinkompass_attempts" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vinkompass_questions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vinkompass_archetypes_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vinkompass_attempts_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_vinkompass_questions_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_vinkompass_archetypes_id_idx";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_vinkompass_attempts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "vinkompass_questions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "vinkompass_archetypes_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "vinkompass_attempts_id";
  DROP TYPE "public"."enum_vinkompass_archetypes_key";`)
}
