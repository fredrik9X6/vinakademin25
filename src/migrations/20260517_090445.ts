import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_session_guesses_guessed_price_bucket" AS ENUM('under_100', '100_200', '200_300', '300_500', '500_plus');
  CREATE TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket" AS ENUM('under_100', '100_200', '200_300', '300_500', '500_plus');
  CREATE TABLE IF NOT EXISTS "session_guesses" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" integer NOT NULL,
  	"session_participant_id" integer,
  	"user_id" integer,
  	"pour_order" numeric NOT NULL,
  	"guessed_country" varchar,
  	"guessed_grape" varchar,
  	"guessed_price_bucket" "enum_session_guesses_guessed_price_bucket",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "blind_answer_country" varchar;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "blind_answer_grape" varchar;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "blind_answer_price_bucket" "enum_tasting_plans_wines_blind_answer_price_bucket";
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "session_guesses_id" integer;
  DO $$ BEGIN
   ALTER TABLE "session_guesses" ADD CONSTRAINT "session_guesses_session_id_course_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."course_sessions"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "session_guesses" ADD CONSTRAINT "session_guesses_session_participant_id_session_participants_id_fk" FOREIGN KEY ("session_participant_id") REFERENCES "public"."session_participants"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "session_guesses" ADD CONSTRAINT "session_guesses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "session_guesses_session_idx" ON "session_guesses" USING btree ("session_id");
  CREATE INDEX IF NOT EXISTS "session_guesses_session_participant_idx" ON "session_guesses" USING btree ("session_participant_id");
  CREATE INDEX IF NOT EXISTS "session_guesses_user_idx" ON "session_guesses" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "session_guesses_pour_order_idx" ON "session_guesses" USING btree ("pour_order");
  CREATE INDEX IF NOT EXISTS "session_guesses_updated_at_idx" ON "session_guesses" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "session_guesses_created_at_idx" ON "session_guesses" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_session_guesses_fk" FOREIGN KEY ("session_guesses_id") REFERENCES "public"."session_guesses"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_session_guesses_id_idx" ON "payload_locked_documents_rels" USING btree ("session_guesses_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "session_guesses" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "session_guesses" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_session_guesses_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_session_guesses_id_idx";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "blind_answer_country";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "blind_answer_grape";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "blind_answer_price_bucket";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "session_guesses_id";
  DROP TYPE "public"."enum_session_guesses_guessed_price_bucket";
  DROP TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket";`)
}
