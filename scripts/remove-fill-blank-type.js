import { Client } from 'pg'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function removeFillBlankType() {
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

    // Check if there are any questions with fill-blank type
    const fillBlankQuestions = await client.query(`
      SELECT id, type FROM questions WHERE type = 'fill-blank';
    `)

    if (fillBlankQuestions.rows.length > 0) {
      console.log(`⚠️  Found ${fillBlankQuestions.rows.length} questions with fill-blank type`)
      console.log('   Updating them to "short-answer" (similar functionality)...')
      
      // Update fill-blank questions to short-answer (they use the same logic)
      await client.query(`
        UPDATE questions
        SET type = 'short-answer'
        WHERE type = 'fill-blank';
      `)
      console.log('✅ Updated fill-blank questions to short-answer')
    } else {
      console.log('✅ No questions with fill-blank type found')
    }

    // Fix the enum type by removing fill-blank
    console.log('🔄 Removing fill-blank from enum_questions_type...')
    
    // Create a temporary column
    await client.query(`
      ALTER TABLE questions
      ADD COLUMN type_new TEXT;
    `)
    
    // Copy valid values, convert fill-blank to short-answer
    await client.query(`
      UPDATE questions
      SET type_new = CASE
        WHEN type::text = 'fill-blank' THEN 'short-answer'
        WHEN type::text IN ('multiple-choice', 'true-false', 'short-answer') THEN type::text
        ELSE 'multiple-choice'
      END;
    `)
    
    // Drop the old column and enum
    await client.query(`
      ALTER TABLE questions DROP COLUMN type;
    `)
    
    // Drop the old enum
    await client.query(`
      DROP TYPE IF EXISTS enum_questions_type CASCADE;
    `)
    
    // Create new enum without fill-blank
    await client.query(`
      CREATE TYPE enum_questions_type AS ENUM ('multiple-choice', 'true-false', 'short-answer');
    `)
    
    // Rename and set type
    await client.query(`
      ALTER TABLE questions
      RENAME COLUMN type_new TO type;
    `)
    
    await client.query(`
      ALTER TABLE questions
      ALTER COLUMN type TYPE enum_questions_type USING type::enum_questions_type;
    `)
    
    console.log('✅ Removed fill-blank from enum_questions_type')
    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

removeFillBlankType()

