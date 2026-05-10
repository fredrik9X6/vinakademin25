import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_session_participants_claim_email_status" AS ENUM('sent', 'skipped_existing_user', 'skipped_no_email', 'failed');
  ALTER TABLE "course_sessions" ADD COLUMN "completed_at" timestamp(3) with time zone;
  ALTER TABLE "course_sessions" ADD COLUMN "claim_emails_dispatched_at" timestamp(3) with time zone;
  ALTER TABLE "session_participants" ADD COLUMN "claim_email_processed_at" timestamp(3) with time zone;
  ALTER TABLE "session_participants" ADD COLUMN "claim_email_status" "enum_session_participants_claim_email_status";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "completed_at";
  ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "claim_emails_dispatched_at";
  ALTER TABLE "session_participants" DROP COLUMN IF EXISTS "claim_email_processed_at";
  ALTER TABLE "session_participants" DROP COLUMN IF EXISTS "claim_email_status";
  DROP TYPE "public"."enum_session_participants_claim_email_status";`)
}
