import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "session_participants" ADD COLUMN "current_lesson_id_id" integer;
  DO $$ BEGIN
   ALTER TABLE "session_participants" ADD CONSTRAINT "session_participants_current_lesson_id_id_content_items_id_fk" FOREIGN KEY ("current_lesson_id_id") REFERENCES "public"."content_items"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "session_participants_current_lesson_id_idx" ON "session_participants" USING btree ("current_lesson_id_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "session_participants" DROP CONSTRAINT "session_participants_current_lesson_id_id_content_items_id_fk";
  
  DROP INDEX IF EXISTS "session_participants_current_lesson_id_idx";
  ALTER TABLE "session_participants" DROP COLUMN IF EXISTS "current_lesson_id_id";`)
}
