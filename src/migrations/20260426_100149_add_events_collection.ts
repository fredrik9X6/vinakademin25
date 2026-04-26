import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_type" AS ENUM('newsletter_subscribed', 'newsletter_unsubscribed', 'account_created', 'account_verified', 'onboarding_completed', 'marketing_opt_in_changed', 'order_paid', 'order_refunded', 'enrollment_started', 'course_completed', 'quiz_passed', 'review_submitted', 'wine_added_to_list', 'login');
  CREATE TYPE "public"."enum_events_source" AS ENUM('web', 'webhook', 'system', 'cron', 'manual');
  CREATE TABLE IF NOT EXISTS "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_events_type" NOT NULL,
  	"contact_email" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"user_id" integer,
  	"subscriber_id" integer,
  	"metadata" jsonb,
  	"source" "enum_events_source" DEFAULT 'system',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  DO $$ BEGIN
   ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "events" ADD CONSTRAINT "events_subscriber_id_subscribers_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."subscribers"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "events_type_idx" ON "events" USING btree ("type");
  CREATE INDEX IF NOT EXISTS "events_contact_email_idx" ON "events" USING btree ("contact_email");
  CREATE INDEX IF NOT EXISTS "events_user_idx" ON "events" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "events_subscriber_idx" ON "events" USING btree ("subscriber_id");
  CREATE INDEX IF NOT EXISTS "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "events_created_at_idx" ON "events" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "events_id";
  DROP TYPE "public"."enum_events_type";
  DROP TYPE "public"."enum_events_source";`)
}
