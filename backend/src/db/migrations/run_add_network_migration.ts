import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { supabase } from '../client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Migration script to add network column to pools table
 * 
 * Run this script with: pnpm tsx src/db/migrations/run_add_network_migration.ts
 * 
 * Note: Supabase doesn't support direct SQL execution via JS client in all cases.
 * You may need to run the SQL file directly in Supabase SQL editor:
 * 1. Open Supabase Dashboard > SQL Editor
 * 2. Copy contents of add_network_column.sql
 * 3. Execute the SQL
 */
async function runMigration() {
  try {
    console.log('📦 Running migration: Add network column to pools table...')
    
    const migrationPath = join(__dirname, 'add_network_column.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Found ${statements.length} SQL statements to execute`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)
        console.log(`SQL: ${statement.substring(0, 100)}...`)
        
        // Try to execute via Supabase RPC if available
        // Note: This may not work for all SQL operations
        const { error } = await supabase.rpc('exec_sql', { sql: statement })
        
        if (error) {
          // If RPC doesn't work, provide instructions
          if (error.message?.includes('function') || error.code === '42883') {
            console.warn('\n⚠️  Direct SQL execution not available via RPC.')
            console.warn('Please run the migration SQL manually in Supabase SQL Editor:')
            console.warn(`\nFile: ${migrationPath}`)
            console.warn('\nOr copy and paste the following SQL into Supabase SQL Editor:\n')
            console.log('='.repeat(80))
            console.log(migrationSQL)
            console.log('='.repeat(80))
            break
          } else {
            throw error
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      }
    }

    console.log('\n✅ Migration complete!')
    console.log('\n📝 Next steps:')
    console.log('1. Verify the network column was added: SELECT * FROM pools LIMIT 1;')
    console.log('2. Update existing pools if needed: UPDATE pools SET network = \'mainnet\' WHERE network IS NULL;')
    console.log('3. Test queries with network filter: SELECT * FROM pools WHERE network = \'mainnet\';')
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\n💡 Alternative: Run the SQL file directly in Supabase SQL Editor')
    console.error(`   File location: ${join(__dirname, 'add_network_column.sql')}`)
    process.exit(1)
  }
}

runMigration()
