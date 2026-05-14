import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "systembolaget_products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_number" varchar NOT NULL,
  	"product_number_short" varchar,
  	"product_name_bold" varchar,
  	"product_name_thin" varchar,
  	"producer_name" varchar,
  	"supplier_name" varchar,
  	"category" varchar,
  	"category_level1" varchar,
  	"category_level2" varchar,
  	"category_level3" varchar,
  	"category_level4" varchar,
  	"custom_category_title" varchar,
  	"country" varchar,
  	"origin_level1" varchar,
  	"origin_level2" varchar,
  	"vintage" numeric,
  	"alcohol_percentage" numeric,
  	"volume" numeric,
  	"volume_text" varchar,
  	"bottle_text" varchar,
  	"packaging_level1" varchar,
  	"seal" varchar,
  	"color" varchar,
  	"taste" varchar,
  	"usage" varchar,
  	"price" numeric,
  	"recycle_fee" numeric,
  	"assortment" varchar,
  	"assortment_text" varchar,
  	"is_discontinued" boolean DEFAULT false,
  	"is_completely_out_of_stock" boolean DEFAULT false,
  	"is_temporary_out_of_stock" boolean DEFAULT false,
  	"is_news" boolean DEFAULT false,
  	"is_organic" boolean DEFAULT false,
  	"is_kosher" boolean DEFAULT false,
  	"is_ethical" boolean DEFAULT false,
  	"ethical_label" varchar,
  	"is_sustainable_choice" boolean DEFAULT false,
  	"is_climate_smart_packaging" boolean DEFAULT false,
  	"image_url" varchar,
  	"product_url" varchar,
  	"search_title" varchar,
  	"grapes" jsonb,
  	"raw" jsonb,
  	"last_imported_at" timestamp(3) with time zone,
  	"source_commit_sha" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "user_wines" ADD COLUMN "custom_wine_systembolaget_product_number" varchar;
  ALTER TABLE "reviews" ADD COLUMN "custom_wine_systembolaget_product_number" varchar;
  ALTER TABLE "tasting_plans_wines" ADD COLUMN "custom_wine_systembolaget_product_number" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "systembolaget_products_id" integer;
  CREATE UNIQUE INDEX IF NOT EXISTS "systembolaget_products_product_number_idx" ON "systembolaget_products" USING btree ("product_number");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_product_name_bold_idx" ON "systembolaget_products" USING btree ("product_name_bold");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_producer_name_idx" ON "systembolaget_products" USING btree ("producer_name");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_category_level1_idx" ON "systembolaget_products" USING btree ("category_level1");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_country_idx" ON "systembolaget_products" USING btree ("country");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_search_title_idx" ON "systembolaget_products" USING btree ("search_title");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_updated_at_idx" ON "systembolaget_products" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "systembolaget_products_created_at_idx" ON "systembolaget_products" USING btree ("created_at");
  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_systembolaget_products_fk" FOREIGN KEY ("systembolaget_products_id") REFERENCES "public"."systembolaget_products"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;
  
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_systembolaget_products_id_idx" ON "payload_locked_documents_rels" USING btree ("systembolaget_products_id");`)

  // Enable trigram extension + GIN indexes for fuzzy search in the product picker.
  // pg_trgm is a standard contrib extension and is available on Neon by default.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "systembolaget_products_search_title_trgm_idx"
      ON "systembolaget_products" USING gin ("search_title" gin_trgm_ops);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "systembolaget_products_product_name_bold_trgm_idx"
      ON "systembolaget_products" USING gin ("product_name_bold" gin_trgm_ops);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "systembolaget_products_producer_name_trgm_idx"
      ON "systembolaget_products" USING gin ("producer_name" gin_trgm_ops);
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "systembolaget_products" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "systembolaget_products" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_systembolaget_products_fk";
  
  DROP INDEX IF EXISTS "payload_locked_documents_rels_systembolaget_products_id_idx";
  ALTER TABLE "user_wines" DROP COLUMN IF EXISTS "custom_wine_systembolaget_product_number";
  ALTER TABLE "reviews" DROP COLUMN IF EXISTS "custom_wine_systembolaget_product_number";
  ALTER TABLE "tasting_plans_wines" DROP COLUMN IF EXISTS "custom_wine_systembolaget_product_number";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "systembolaget_products_id";`)
}
