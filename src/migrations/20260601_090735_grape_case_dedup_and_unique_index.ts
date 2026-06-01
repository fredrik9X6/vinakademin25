import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Grape case-dedup + case-insensitive unique index.
 *
 * up (idempotent — safe to run on an already-clean DB like prod):
 *   1. Merge case-duplicate grapes: for each group sharing lower(btrim(name)),
 *      pick a canonical row (prefer a name that has uppercase — the proper display
 *      form — then lowest id). Re-point all four rels tables to the canonical id,
 *      deleting any would-be-collision rows first, then delete the non-canonical
 *      grapes rows.
 *   2. Add a case-insensitive unique index: lower(btrim(name)) so the DB rejects
 *      future case/whitespace duplicates.
 *
 * down:
 *   Drops the functional unique index. The data merge is not reversible.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- ── Step 1: Merge case-duplicate grapes ──────────────────────────────────
    --
    -- Build a mapping of non-canonical rows → their canonical replacement.
    -- Canonical = first row by (name = lower(name)) ASC, id ASC within each
    -- lower(btrim(name)) group.  Rows where name has at least one uppercase
    -- character sort before all-lowercase rows, giving us the proper display
    -- form.  If all variants are already lowercase, we take the lowest id.
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      -- Iterate over non-canonical rows (safe to run when table is already clean).
      FOR r IN
        WITH canon AS (
          SELECT
            id,
            first_value(id) OVER (
              PARTITION BY lower(btrim(name))
              ORDER BY (name = lower(name)), id
            ) AS canonical_id
          FROM grapes
        )
        SELECT id AS dup_id, canonical_id
        FROM canon
        WHERE id <> canonical_id
      LOOP
        -- wines_rels: delete would-be-collision rows, then re-point.
        DELETE FROM wines_rels
        WHERE grapes_id = r.dup_id
          AND (parent_id, path) IN (
            SELECT parent_id, path FROM wines_rels WHERE grapes_id = r.canonical_id
          );
        UPDATE wines_rels SET grapes_id = r.canonical_id WHERE grapes_id = r.dup_id;

        -- blind_battles_rels: delete would-be-collision rows, then re-point.
        DELETE FROM blind_battles_rels
        WHERE grapes_id = r.dup_id
          AND (parent_id, path) IN (
            SELECT parent_id, path FROM blind_battles_rels WHERE grapes_id = r.canonical_id
          );
        UPDATE blind_battles_rels SET grapes_id = r.canonical_id WHERE grapes_id = r.dup_id;

        -- users_rels: delete would-be-collision rows, then re-point.
        DELETE FROM users_rels
        WHERE grapes_id = r.dup_id
          AND (parent_id, path) IN (
            SELECT parent_id, path FROM users_rels WHERE grapes_id = r.canonical_id
          );
        UPDATE users_rels SET grapes_id = r.canonical_id WHERE grapes_id = r.dup_id;

        -- payload_locked_documents_rels: delete would-be-collision rows, then re-point.
        DELETE FROM payload_locked_documents_rels
        WHERE grapes_id = r.dup_id
          AND (parent_id, path) IN (
            SELECT parent_id, path FROM payload_locked_documents_rels WHERE grapes_id = r.canonical_id
          );
        UPDATE payload_locked_documents_rels SET grapes_id = r.canonical_id WHERE grapes_id = r.dup_id;

        -- Delete the non-canonical grape row now that all references are gone.
        DELETE FROM grapes WHERE id = r.dup_id;
      END LOOP;
    END $$;

    -- ── Step 2: Add the case-insensitive unique guard ─────────────────────────
    --
    -- CREATE UNIQUE INDEX … IF NOT EXISTS is idempotent — no-op if the index
    -- already exists (e.g. on prod where dupes were already manually removed).
    -- Running without CONCURRENTLY is intentional: Payload wraps each migration
    -- in a transaction, and CONCURRENTLY is not allowed inside a transaction.
    CREATE UNIQUE INDEX IF NOT EXISTS "grapes_name_lower_unique"
      ON "grapes" (lower(btrim("name")));
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Drop the case-insensitive unique index.
    -- NOTE: The data merge from up() is not reversible — non-canonical duplicate
    -- grape rows have been permanently deleted.
    DROP INDEX IF EXISTS "grapes_name_lower_unique";
  `)
}
