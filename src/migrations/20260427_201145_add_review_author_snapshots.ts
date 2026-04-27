import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Two intertwined fixes around review preservation:
 *
 *  1. Drop NOT NULL on `course_reviews.author_id`. The previous migration that
 *     unblocked user deletion fixed eight tables but this one slipped through —
 *     same NOT NULL ↔ ON DELETE SET NULL paradox, would still 25P02 if a user
 *     had ever written a course review.
 *
 *  2. Add `authorDisplayName` to both reviews and course_reviews so the author's
 *     name persists on the document after the user is deleted. The hooks in the
 *     collection definitions populate this snapshot at create-time. Existing
 *     rows are backfilled from the current users table.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- (1) Fix the missed user-delete blocker
    ALTER TABLE "course_reviews" ALTER COLUMN "author_id" DROP NOT NULL;

    -- (2) Add the snapshot columns
    ALTER TABLE "reviews" ADD COLUMN "author_display_name" varchar;
    ALTER TABLE "course_reviews" ADD COLUMN "author_display_name" varchar;

    -- (3) Backfill from current users so existing reviews keep attribution.
    --    TRIM + NULLIF guards against rows where firstName/lastName are blank.
    UPDATE "reviews" r
    SET "author_display_name" = NULLIF(
      TRIM(COALESCE(u."first_name", '') || ' ' || COALESCE(u."last_name", '')),
      ''
    )
    FROM "users" u
    WHERE r."user_id" = u."id" AND r."author_display_name" IS NULL;

    UPDATE "course_reviews" cr
    SET "author_display_name" = NULLIF(
      TRIM(COALESCE(u."first_name", '') || ' ' || COALESCE(u."last_name", '')),
      ''
    )
    FROM "users" u
    WHERE cr."author_id" = u."id" AND cr."author_display_name" IS NULL;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "course_reviews" ALTER COLUMN "author_id" SET NOT NULL;
    ALTER TABLE "reviews" DROP COLUMN IF EXISTS "author_display_name";
    ALTER TABLE "course_reviews" DROP COLUMN IF EXISTS "author_display_name";
  `)
}
