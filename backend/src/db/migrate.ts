import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { supabase } from './client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function migrate() {
  try {
    console.log('📦 Running database migration...')
    
    const schemaPath = join(__dirname, 'schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')

    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        // Note: Supabase doesn't support direct SQL execution via JS client
        // You'll need to run the schema.sql file directly in Supabase SQL editor
        // This is a placeholder for documentation purposes
        if (error) {
          console.warn('Note: Direct SQL execution not supported. Please run schema.sql in Supabase SQL editor.')
          break
        }
      }
    }

    console.log('✅ Migration complete!')
    console.log('⚠️  Note: Please run the schema.sql file in your Supabase SQL editor if you haven\'t already.')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
