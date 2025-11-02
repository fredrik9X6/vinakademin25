import { Client } from 'pg'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function fixCorrectAnswerTrueFalseEnum() {
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

    // Check if the column exists and its current type
    const columnCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'questions' AND column_name = 'correct_answer_true_false';
    `)

    if (columnCheck.rows.length === 0) {
      console.log('ℹ️  Column correct_answer_true_false does not exist yet. PayloadCMS will create it.')
      return
    }

    const currentType = columnCheck.rows[0].data_type
    console.log(`📊 Current column type: ${currentType}`)

    // Check if enum already exists
    const enumExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'enum_questions_correct_answer_true_false'
      );
    `)

    if (currentType === 'USER-DEFINED') {
      // Already an enum, check if it's the right one
      const enumType = await client.query(`
        SELECT typname FROM pg_type 
        WHERE oid = (
          SELECT udt_name::regtype FROM information_schema.columns 
          WHERE table_name = 'questions' AND column_name = 'correct_answer_true_false'
        );
      `)
      
      if (enumType.rows[0]?.typname === 'enum_questions_correct_answer_true_false') {
        console.log('✅ Column is already the correct enum type')
        return
      }
    }

    // Create the enum type if it doesn't exist
    if (!enumExists.rows[0].exists) {
      console.log('📊 Creating enum_questions_correct_answer_true_false...')
      await client.query(`
        CREATE TYPE enum_questions_correct_answer_true_false AS ENUM ('true', 'false');
      `)
      console.log('✅ Created enum type')
    }

    // If column is TEXT, convert it to the enum
    if (currentType === 'text') {
      console.log('🔄 Converting TEXT column to enum...')
      
      // First, ensure all values are valid ('true' or 'false')
      await client.query(`
        UPDATE questions
        SET correct_answer_true_false = CASE
          WHEN correct_answer_true_false IN ('true', 'false') THEN correct_answer_true_false
          WHEN correct_answer_true_false IS NULL THEN NULL
          ELSE 'true'  -- Default fallback
        END;
      `)
      
      // Cast the column to enum
      await client.query(`
        ALTER TABLE questions
        ALTER COLUMN correct_answer_true_false TYPE enum_questions_correct_answer_true_false
        USING correct_answer_true_false::enum_questions_correct_answer_true_false;
      `)
      
      console.log('✅ Converted column to enum type')
    } else if (currentType === 'USER-DEFINED') {
      // Already an enum, but might be wrong type - drop and recreate
      console.log('🔄 Column is already an enum, but may be wrong type. Recreating...')
      
      // Create temporary column
      await client.query(`
        ALTER TABLE questions
        ADD COLUMN correct_answer_true_false_new TEXT;
      `)
      
      // Copy valid values
      await client.query(`
        UPDATE questions
        SET correct_answer_true_false_new = correct_answer_true_false::text
        WHERE correct_answer_true_false IS NOT NULL;
      `)
      
      // Drop old column
      await client.query(`
        ALTER TABLE questions
        DROP COLUMN correct_answer_true_false;
      `)
      
      // Rename new column
      await client.query(`
        ALTER TABLE questions
        RENAME COLUMN correct_answer_true_false_new TO correct_answer_true_false;
      `)
      
      // Cast to enum
      await client.query(`
        ALTER TABLE questions
        ALTER COLUMN correct_answer_true_false TYPE enum_questions_correct_answer_true_false
        USING correct_answer_true_false::enum_questions_correct_answer_true_false;
      `)
      
      console.log('✅ Recreated column as correct enum type')
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

fixCorrectAnswerTrueFalseEnum()

