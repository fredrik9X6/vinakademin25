import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_template_entitlements_status" AS ENUM('active', 'refunded');
  CREATE TYPE "public"."enum_template_entitlements_acquired_via" AS ENUM('purchase', 'subscription', 'free_trial', 'free', 'admin_grant');
  CREATE TABLE IF NOT EXISTS "template_entitlements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"template_id" integer NOT NULL,
  	"status" "enum_template_entitlements_status" DEFAULT 'active' NOT NULL,
  	"acquired_via" "enum_template_entitlements_acquired_via" NOT NULL,
  	"acquired_at" timestamp(3) with time zone NOT NULL,
  	"payment_amount" numeric,
  	"payment_currency" varchar DEFAULT 'SEK',
  	"payment_transaction_id" varchar,
  	"payment_paid_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "tasting_templates" ALTER COLUMN "access_level" SET DEFAULT 'paid';
  ALTER TABLE "tasting_templates" ADD COLUMN "price_sek" numeric DEFAULT 99 NOT NULL;
  ALTER TABLE "tasting_templates" ADD COLUMN "is_free_trial" boolean DEFAULT false;
  ALTER TABLE "tasting_templates" ADD COLUMN "stripe_product_id" varchar;
  ALTER TABLE "tasting_templates" ADD COLUMN "stripe_price_id" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "template_entitlements_id" integer;
  DO $$ BEGIN
   ALTER TABLE "template_entitlements" ADD CONSTRAINT "template_entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "template_entitlements" ADD CONSTRAINT "template_entitlements_template_id_tasting_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."tasting_templates"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "template_entitlements_user_idx" ON "template_entitlements" USING btree ("user_id");
  CREATE INDEX IF NOT EXISTS "template_entitlements_template_idx" ON "template_entitlements" USING btree ("template_id");
  CREATE INDEX IF NOT EXISTS "template_entitlements_payment_payment_transaction_id_idx" ON "template_entitlements" USING btree ("payment_transaction_id");
  CREATE INDEX IF NOT EXISTS "template_entitlements_updated_at_idx" ON "template_entitlements" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "template_entitlements_created_at_idx" ON "template_entitlements" USING btree ("created_at");
  CREATE UNIQUE INDEX IF NOT EXISTS "user_template_idx" ON "template_entitlements" USING btree ("user_id","template_id");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_template_entitlements_fk" FOREIGN KEY ("template_entitlements_id") REFERENCES "public"."template_entitlements"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_template_entitlements_id_idx" ON "payload_locked_documents_rels" USING btree ("template_entitlements_id");
  ALTER TABLE "public"."tasting_templates" ALTER COLUMN "access_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_tasting_templates_access_level";
  CREATE TYPE "public"."enum_tasting_templates_access_level" AS ENUM('free', 'paid');
  -- Data-preserving backfill: every legacy 'members_only' template is now
  -- 'paid' (priceSek defaulted to 99 by the new column above). Without this
  -- the column cast below fails on any existing row whose access_level is
  -- 'members_only', because that value no longer exists in the new enum.
  -- Spec D.1 (data migration of existing members_only rows).
  UPDATE "public"."tasting_templates" SET "access_level" = 'paid' WHERE "access_level" = 'members_only';
  ALTER TABLE "public"."tasting_templates" ALTER COLUMN "access_level" SET DATA TYPE "public"."enum_tasting_templates_access_level" USING "access_level"::"public"."enum_tasting_templates_access_level";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "template_entitlements" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "template_entitlements" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_template_entitlements_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_template_entitlements_id_idx";
  ALTER TABLE "tasting_templates" ALTER COLUMN "access_level" SET DEFAULT 'free';
  ALTER TABLE "tasting_templates" DROP COLUMN IF EXISTS "price_sek";
  ALTER TABLE "tasting_templates" DROP COLUMN IF EXISTS "is_free_trial";
  ALTER TABLE "tasting_templates" DROP COLUMN IF EXISTS "stripe_product_id";
  ALTER TABLE "tasting_templates" DROP COLUMN IF EXISTS "stripe_price_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "template_entitlements_id";
  ALTER TABLE "public"."tasting_templates" ALTER COLUMN "access_level" SET DATA TYPE text;
  DROP TYPE "public"."enum_tasting_templates_access_level";
  CREATE TYPE "public"."enum_tasting_templates_access_level" AS ENUM('free', 'members_only');
  ALTER TABLE "public"."tasting_templates" ALTER COLUMN "access_level" SET DATA TYPE "public"."enum_tasting_templates_access_level" USING "access_level"::"public"."enum_tasting_templates_access_level";
  DROP TYPE "public"."enum_template_entitlements_status";
  DROP TYPE "public"."enum_template_entitlements_acquired_via";`)
}
