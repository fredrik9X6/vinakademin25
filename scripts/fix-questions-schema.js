import { Client } from 'pg'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function fixQuestionsSchema() {
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

    // Step 1: Check if there are any questions with invalid types (essay or matching)
    const invalidTypes = await client.query(`
      SELECT id, type FROM questions WHERE type IN ('essay', 'matching');
    `)

    if (invalidTypes.rows.length > 0) {
      console.log(`⚠️  Found ${invalidTypes.rows.length} questions with invalid types (essay/matching)`)
      console.log('   Updating them to "multiple-choice" (you may want to review these manually)...')
      
      // Update essay/matching questions to multiple-choice (safer default)
      await client.query(`
        UPDATE questions
        SET type = 'multiple-choice'
        WHERE type IN ('essay', 'matching');
      `)
      console.log('✅ Updated invalid question types')
    } else {
      console.log('✅ No questions with invalid types found')
    }

    // Step 2: Check if correct_answer_true_false column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'correct_answer_true_false';
    `)

    if (columnCheck.rows.length === 0) {
      console.log('📊 Adding correct_answer_true_false column...')
      
      // Add the new column as text (we'll convert to enum if needed)
      await client.query(`
        ALTER TABLE questions
        ADD COLUMN correct_answer_true_false TEXT;
      `)
      
      // Migrate existing true-false questions from correct_answer to correct_answer_true_false
      console.log('🔄 Migrating existing true-false question answers...')
      await client.query(`
        UPDATE questions
        SET correct_answer_true_false = correct_answer
        WHERE type = 'true-false' AND correct_answer IS NOT NULL;
      `)
      
      console.log('✅ Added correct_answer_true_false column and migrated data')
    } else {
      console.log('ℹ️  Column correct_answer_true_false already exists')
    }

    // Step 3: Fix the enum type by dropping and recreating with new values
    console.log('🔄 Fixing enum_questions_type...')
    
    // First, check current enum values
    const enumValues = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'enum_questions_type'
      )
      ORDER BY enumsortorder;
    `)

    const currentValues = enumValues.rows.map(r => r.enumlabel)
    const expectedValues = ['multiple-choice', 'true-false', 'short-answer', 'fill-blank']
    
    // Check if enum needs updating
    const needsUpdate = !expectedValues.every(v => currentValues.includes(v)) ||
                       currentValues.some(v => !expectedValues.includes(v))

    if (needsUpdate) {
      console.log(`   Current enum values: ${currentValues.join(', ')}`)
      console.log(`   Expected values: ${expectedValues.join(', ')}`)
      
      // Create a temporary column
      await client.query(`
        ALTER TABLE questions
        ADD COLUMN type_new TEXT;
      `)
      
      // Copy valid values, convert invalid ones
      await client.query(`
        UPDATE questions
        SET type_new = CASE
          WHEN type IN ('multiple-choice', 'true-false', 'short-answer', 'fill-blank') THEN type
          ELSE 'multiple-choice'
        END;
      `)
      
      // Drop the old column and enum
      await client.query(`
        ALTER TABLE questions DROP COLUMN type;
      `)
      
      // Drop the old enum if it exists
      await client.query(`
        DROP TYPE IF EXISTS enum_questions_type CASCADE;
      `)
      
      // Create new enum with correct values
      await client.query(`
        CREATE TYPE enum_questions_type AS ENUM ('multiple-choice', 'true-false', 'short-answer', 'fill-blank');
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
      
      console.log('✅ Fixed enum_questions_type')
    } else {
      console.log('✅ Enum values are correct')
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

fixQuestionsSchema()

