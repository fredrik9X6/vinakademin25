import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_sessions" ADD COLUMN "wrap_up_emails_dispatched_at" timestamp(3) with time zone;
  ALTER TABLE "session_participants" ADD COLUMN "wrap_up_email_dispatched_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "wrap_up_emails_dispatched_at";
  ALTER TABLE "session_participants" DROP COLUMN IF EXISTS "wrap_up_email_dispatched_at";`)
}
