import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "vinkompass_attempts"
    DROP CONSTRAINT IF EXISTS "vinkompass_attempts_archetype_id_vinkompass_archetypes_id_fk";

    ALTER TABLE "vinkompass_attempts"
    ADD CONSTRAINT "vinkompass_attempts_archetype_id_vinkompass_archetypes_id_fk"
    FOREIGN KEY ("archetype_id")
    REFERENCES "public"."vinkompass_archetypes"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Rollback to the original (broken) state — kept for parity with the down
  // path of the previous migration. Production should never run this.
  await db.execute(sql`
    ALTER TABLE "vinkompass_attempts"
    DROP CONSTRAINT IF EXISTS "vinkompass_attempts_archetype_id_vinkompass_archetypes_id_fk";

    ALTER TABLE "vinkompass_attempts"
    ADD CONSTRAINT "vinkompass_attempts_archetype_id_vinkompass_archetypes_id_fk"
    FOREIGN KEY ("archetype_id")
    REFERENCES "public"."vinkompass_archetypes"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION;
  `)
}
