import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add slug column to regions (nullable to handle existing rows)
  await db.execute(sql`
    ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "slug" varchar;
  `)

  // Backfill slug from name for existing region rows
  await db.execute(sql`
    UPDATE "regions"
    SET "slug" = regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower("name"), '[åä]', 'a', 'g'),
          'ö', 'o', 'g'
        ),
        '[^a-z0-9]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    )
    WHERE "slug" IS NULL;
  `)

  // Add unique index for regions slug
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "regions_slug_idx" ON "regions" ("slug");
  `)

  // Change description from text to jsonb on regions (drops existing text values)
  await db.execute(sql`
    ALTER TABLE "regions" DROP COLUMN IF EXISTS "description";
  `)
  await db.execute(sql`
    ALTER TABLE "regions" ADD COLUMN "description" jsonb;
  `)

  // Add slug column to countries (nullable to handle existing rows)
  await db.execute(sql`
    ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "slug" varchar;
  `)

  // Backfill slug from name for existing country rows
  await db.execute(sql`
    UPDATE "countries"
    SET "slug" = regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower("name"), '[åä]', 'a', 'g'),
          'ö', 'o', 'g'
        ),
        '[^a-z0-9]+', '-', 'g'
      ),
      '^-+|-+$', '', 'g'
    )
    WHERE "slug" IS NULL;
  `)

  // Add unique index for countries slug
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "countries_slug_idx" ON "countries" ("slug");
  `)

  // Change description from text to jsonb on countries (drops existing text values)
  await db.execute(sql`
    ALTER TABLE "countries" DROP COLUMN IF EXISTS "description";
  `)
  await db.execute(sql`
    ALTER TABLE "countries" ADD COLUMN "description" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "regions_slug_idx";
    ALTER TABLE "regions" DROP COLUMN IF EXISTS "slug";
    ALTER TABLE "regions" DROP COLUMN IF EXISTS "description";
    ALTER TABLE "regions" ADD COLUMN "description" varchar;
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "countries_slug_idx";
    ALTER TABLE "countries" DROP COLUMN IF EXISTS "slug";
    ALTER TABLE "countries" DROP COLUMN IF EXISTS "description";
    ALTER TABLE "countries" ADD COLUMN "description" varchar;
  `)
}
