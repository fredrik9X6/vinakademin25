import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates" ALTER COLUMN "access_level" SET DEFAULT 'free';`)

  // Every existing template becomes publicly readable. The signup gate moved
  // from viewing to *using* (clone / builder / hosting), all already gated.
  await db.execute(sql`UPDATE "tasting_templates" SET "access_level" = 'free'`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "tasting_templates" ALTER COLUMN "access_level" SET DEFAULT 'paid';`)
}
