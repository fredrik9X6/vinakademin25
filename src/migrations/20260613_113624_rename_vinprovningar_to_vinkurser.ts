import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscriptions_rels" DROP CONSTRAINT "subscriptions_rels_vinprovningar_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vinprovningar_fk";
  
  DO $$ BEGIN
   ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_vinkurser_fk" FOREIGN KEY ("vinprovningar_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vinkurser_fk" FOREIGN KEY ("vinprovningar_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscriptions_rels" DROP CONSTRAINT "subscriptions_rels_vinkurser_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_vinkurser_fk";
  
  DO $$ BEGIN
   ALTER TABLE "subscriptions_rels" ADD CONSTRAINT "subscriptions_rels_vinprovningar_fk" FOREIGN KEY ("vinprovningar_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vinprovningar_fk" FOREIGN KEY ("vinprovningar_id") REFERENCES "public"."vinprovningar"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  `)
}
