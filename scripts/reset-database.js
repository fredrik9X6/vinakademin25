import { Client } from 'pg'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

async function resetDatabase() {
  // Get connection string from environment
  const connectionString =
    process.env.DATABASE_URI ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    'postgresql://postgres:postgres@localhost:5432/vinakademin25'

  console.log('Connecting to database...')
  const client = new Client({
    connectionString,
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Drop all tables and types
    console.log('Dropping all tables and types...')
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `)

    console.log('✅ Database reset successfully')
    console.log('You can now restart your dev server and PayloadCMS will create the new schema')
  } catch (error) {
    console.error('❌ Error resetting database:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

resetDatabase()
