import { Client } from 'pg'

async function resetDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'vinakademin25',
    user: 'postgres',
    password: 'postgres',
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Drop all tables
    console.log('Dropping all tables...')
    await client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO postgres;
      GRANT ALL ON SCHEMA public TO public;
    `)

    console.log('Database reset successfully')
  } catch (error) {
    console.error('Error resetting database:', error)
  } finally {
    await client.end()
  }
}

resetDatabase()
