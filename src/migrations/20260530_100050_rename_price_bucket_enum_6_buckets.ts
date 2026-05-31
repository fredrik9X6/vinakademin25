import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Recreate both blind-tasting price-bucket enum types, going from the 5 legacy
 * values to the 6 finer-grained values, and remap existing rows in place.
 *
 * Postgres cannot drop in-use enum *values*, so for each enum we: cast the
 * column to text (detaching it from the old type), remap legacy text values to
 * the new vocabulary, NULL out anything that still isn't a valid new value
 * (defensive — keeps the final ::enum cast from erroring), drop + recreate the
 * enum type with the new values, then re-attach the column.
 *
 * Affected columns:
 *   session_guesses.guessed_price_bucket            (enum_session_guesses_guessed_price_bucket)
 *   tasting_plans_wines.blind_answer_price_bucket   (enum_tasting_plans_wines_blind_answer_price_bucket)
 *
 * Remap (lossy: wide buckets split → lower sub-bucket; 300_500 + 500_plus → 300_plus):
 *   under_100 → 0_99 | 100_200 → 100_149 | 200_300 → 200_249 | 300_500 → 300_plus | 500_plus → 300_plus
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- ── session_guesses.guessed_price_bucket ──────────────────────────────
  -- 1. Detach the column from the old enum type (cast to text).
  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE varchar
    USING "guessed_price_bucket"::varchar;

  -- 2. Remap legacy values in place (lossy split → lower sub-bucket).
  UPDATE "session_guesses" SET "guessed_price_bucket" = CASE "guessed_price_bucket"
    WHEN 'under_100' THEN '0_99'
    WHEN '100_200'  THEN '100_149'
    WHEN '200_300'  THEN '200_249'
    WHEN '300_500'  THEN '300_plus'
    WHEN '500_plus' THEN '300_plus'
    ELSE "guessed_price_bucket"
  END
  WHERE "guessed_price_bucket" IS NOT NULL;

  -- 3. Null out anything that still isn't a valid new value (defensive).
  UPDATE "session_guesses" SET "guessed_price_bucket" = NULL
  WHERE "guessed_price_bucket" IS NOT NULL
    AND "guessed_price_bucket" NOT IN ('0_99','100_149','150_199','200_249','250_299','300_plus');

  -- 4. Recreate the enum type with the new values.
  DROP TYPE "public"."enum_session_guesses_guessed_price_bucket";
  CREATE TYPE "public"."enum_session_guesses_guessed_price_bucket"
    AS ENUM('0_99','100_149','150_199','200_249','250_299','300_plus');

  -- 5. Re-attach the column to the new enum type.
  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE "public"."enum_session_guesses_guessed_price_bucket"
    USING "guessed_price_bucket"::"public"."enum_session_guesses_guessed_price_bucket";

  -- ── tasting_plans_wines.blind_answer_price_bucket ─────────────────────
  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE varchar
    USING "blind_answer_price_bucket"::varchar;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = CASE "blind_answer_price_bucket"
    WHEN 'under_100' THEN '0_99'
    WHEN '100_200'  THEN '100_149'
    WHEN '200_300'  THEN '200_249'
    WHEN '300_500'  THEN '300_plus'
    WHEN '500_plus' THEN '300_plus'
    ELSE "blind_answer_price_bucket"
  END
  WHERE "blind_answer_price_bucket" IS NOT NULL;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = NULL
  WHERE "blind_answer_price_bucket" IS NOT NULL
    AND "blind_answer_price_bucket" NOT IN ('0_99','100_149','150_199','200_249','250_299','300_plus');

  DROP TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  CREATE TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    AS ENUM('0_99','100_149','150_199','200_249','250_299','300_plus');

  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    USING "blind_answer_price_bucket"::"public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  -- Reverse: recreate the legacy 5-value enums and best-effort remap new → old.
  -- (Lossy splits can't be un-split; new sub-buckets fold back to the wide bucket.)
  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE varchar
    USING "guessed_price_bucket"::varchar;

  UPDATE "session_guesses" SET "guessed_price_bucket" = CASE "guessed_price_bucket"
    WHEN '0_99'     THEN 'under_100'
    WHEN '100_149'  THEN '100_200'
    WHEN '150_199'  THEN '100_200'
    WHEN '200_249'  THEN '200_300'
    WHEN '250_299'  THEN '200_300'
    WHEN '300_plus' THEN '300_500'
    ELSE "guessed_price_bucket"
  END
  WHERE "guessed_price_bucket" IS NOT NULL;

  UPDATE "session_guesses" SET "guessed_price_bucket" = NULL
  WHERE "guessed_price_bucket" IS NOT NULL
    AND "guessed_price_bucket" NOT IN ('under_100','100_200','200_300','300_500','500_plus');

  DROP TYPE "public"."enum_session_guesses_guessed_price_bucket";
  CREATE TYPE "public"."enum_session_guesses_guessed_price_bucket"
    AS ENUM('under_100','100_200','200_300','300_500','500_plus');

  ALTER TABLE "session_guesses"
    ALTER COLUMN "guessed_price_bucket" TYPE "public"."enum_session_guesses_guessed_price_bucket"
    USING "guessed_price_bucket"::"public"."enum_session_guesses_guessed_price_bucket";

  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE varchar
    USING "blind_answer_price_bucket"::varchar;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = CASE "blind_answer_price_bucket"
    WHEN '0_99'     THEN 'under_100'
    WHEN '100_149'  THEN '100_200'
    WHEN '150_199'  THEN '100_200'
    WHEN '200_249'  THEN '200_300'
    WHEN '250_299'  THEN '200_300'
    WHEN '300_plus' THEN '300_500'
    ELSE "blind_answer_price_bucket"
  END
  WHERE "blind_answer_price_bucket" IS NOT NULL;

  UPDATE "tasting_plans_wines" SET "blind_answer_price_bucket" = NULL
  WHERE "blind_answer_price_bucket" IS NOT NULL
    AND "blind_answer_price_bucket" NOT IN ('under_100','100_200','200_300','300_500','500_plus');

  DROP TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  CREATE TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    AS ENUM('under_100','100_200','200_300','300_500','500_plus');

  ALTER TABLE "tasting_plans_wines"
    ALTER COLUMN "blind_answer_price_bucket" TYPE "public"."enum_tasting_plans_wines_blind_answer_price_bucket"
    USING "blind_answer_price_bucket"::"public"."enum_tasting_plans_wines_blind_answer_price_bucket";
  `)
}
