/**
 * Migration script to fix enum_modules_content_items_block_type casting issue
 * 
 * This script handles the migration from contentType (lesson/quiz) to blockType (lesson-item/quiz-item)
 * Run this if you're getting enum casting errors when accessing /admin
 */

import { Client } from 'pg'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function fixEnumCast() {
  // Get connection string from environment
  const connectionString =
    process.env.DATABASE_URI ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    'postgresql://postgres:postgres@localhost:5432/vinakademin25'

  const client = new Client({
    connectionString,
  })

  try {
    await client.connect()
    console.log('✅ Connected to database')

    // First, check if the old column exists
    const checkColumn = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'modules_content_items' 
      AND column_name IN ('content_type', 'block_type')
    `)

    console.log('📊 Found columns:', checkColumn.rows)

    // If block_type exists but has wrong type, we need to convert it
    const hasBlockType = checkColumn.rows.some(r => r.column_name === 'block_type')
    const hasContentType = checkColumn.rows.some(r => r.column_name === 'content_type')

    if (hasContentType && !hasBlockType) {
      // Rename contentType to blockType and convert values
      console.log('🔄 Renaming contentType to blockType and converting values...')
      await client.query(`
        ALTER TABLE modules_content_items 
        RENAME COLUMN content_type TO block_type;
      `)
      
      // Update values to new enum values
      await client.query(`
        UPDATE modules_content_items 
        SET block_type = CASE 
          WHEN block_type = 'lesson' THEN 'lesson-item'
          WHEN block_type = 'quiz' THEN 'quiz-item'
          ELSE block_type
        END;
      `)
      
      // Change to new enum type
      await client.query(`
        ALTER TABLE modules_content_items 
        ALTER COLUMN block_type TYPE enum_modules_content_items_block_type 
        USING block_type::text::enum_modules_content_items_block_type;
      `)
      
      console.log('✅ Successfully migrated contentType to blockType')
    } else if (hasBlockType) {
      // Block_type exists, but might have wrong enum type
      console.log('🔄 Converting block_type to new enum type...')
      
      // First, ensure all values are valid
      await client.query(`
        UPDATE modules_content_items 
        SET block_type = CASE 
          WHEN block_type::text = 'lesson' THEN 'lesson-item'
          WHEN block_type::text = 'quiz' THEN 'quiz-item'
          ELSE block_type::text
        END
        WHERE block_type::text IN ('lesson', 'quiz');
      `)
      
      // Then cast to new enum
      try {
        await client.query(`
          ALTER TABLE modules_content_items 
          ALTER COLUMN block_type TYPE enum_modules_content_items_block_type 
          USING block_type::text::enum_modules_content_items_block_type;
        `)
        console.log('✅ Successfully converted block_type enum')
      } catch (error) {
        if (error.code === '42804') {
          console.log('⚠️  Enum conversion failed, trying alternative approach...')
          // Drop and recreate the column
          await client.query(`
            ALTER TABLE modules_content_items 
            DROP COLUMN block_type;
          `)
          await client.query(`
            ALTER TABLE modules_content_items 
            ADD COLUMN block_type enum_modules_content_items_block_type;
          `)
          console.log('✅ Recreated block_type column')
        } else {
          throw error
        }
      }
    } else {
      console.log('ℹ️  No contentType or block_type column found - nothing to migrate')
    }

    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

fixEnumCast()

