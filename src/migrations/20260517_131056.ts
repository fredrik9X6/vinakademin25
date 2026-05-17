import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Create the new texts join table that backs `tasting_plans.wines[].blindAnswerGrapes`
  // (hasMany text). Payload's convention puts all hasMany-text rows on a
  // single per-collection table keyed by `path`.
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "tasting_plans_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );

  ALTER TABLE "course_sessions" ADD COLUMN "blind_guess_easy_mode" boolean DEFAULT false;
  ALTER TABLE "tasting_plans" ADD COLUMN "blind_guess_easy_mode_by_default" boolean DEFAULT false;
  DO $$ BEGIN
   ALTER TABLE "tasting_plans_texts" ADD CONSTRAINT "tasting_plans_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tasting_plans"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;

  CREATE INDEX IF NOT EXISTS "tasting_plans_texts_order_parent_idx" ON "tasting_plans_texts" USING btree ("order","parent_id");`)

  // Data move: copy existing single-grape values into the new array structure
  // before we drop the column. Path format is `wines.<order>.blindAnswerGrapes`
  // — Payload v3's convention for hasMany-text nested inside an array field.
  // _order on tasting_plans_wines is 0-based and matches the array index.
  await db.execute(sql`
   INSERT INTO "tasting_plans_texts" ("parent_id", "order", "path", "text")
   SELECT
     w."_parent_id" AS parent_id,
     0 AS "order",
     'wines.' || w."_order" || '.blindAnswerGrapes' AS path,
     w."blind_answer_grape" AS text
   FROM "tasting_plans_wines" w
   WHERE w."blind_answer_grape" IS NOT NULL AND w."blind_answer_grape" <> '';`)

  // Now safe to drop the legacy single-value column.
  await db.execute(sql`
   ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "blind_answer_grape";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Reverse: restore the single-value column, copy the first grape per wine
  // back, then drop the texts table. Blends collapse to their first acceptable
  // value — lossy by design (the `down` path is for emergency rollback only).
  await db.execute(sql`
   ALTER TABLE "tasting_plans_wines" ADD COLUMN "blind_answer_grape" varchar;`)

  await db.execute(sql`
   UPDATE "tasting_plans_wines" w
   SET "blind_answer_grape" = sub.text
   FROM (
     SELECT DISTINCT ON ("parent_id", "path")
       "parent_id",
       "path",
       "text"
     FROM "tasting_plans_texts"
     WHERE "path" LIKE 'wines.%.blindAnswerGrapes'
     ORDER BY "parent_id", "path", "order"
   ) sub
   WHERE w."_parent_id" = sub.parent_id
     AND ('wines.' || w."_order" || '.blindAnswerGrapes') = sub.path;`)

  await db.execute(sql`
   DROP TABLE "tasting_plans_texts" CASCADE;
   ALTER TABLE "course_sessions" DROP COLUMN IF EXISTS "blind_guess_easy_mode";
   ALTER TABLE "tasting_plans" DROP COLUMN IF EXISTS "blind_guess_easy_mode_by_default";`)
}
