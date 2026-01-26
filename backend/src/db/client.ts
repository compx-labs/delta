import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file from backend root directory
dotenv.config({ path: join(__dirname, '../../.env') })

const supabaseUrl = process.env.SUPABASE_URL?.trim()
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables:', {
    SUPABASE_URL: supabaseUrl ? '✓ Set' : '✗ Missing',
    SUPABASE_PUBLISHABLE_DEFAULT_KEY: supabaseKey ? '✓ Set' : '✗ Missing',
  })
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_DEFAULT_KEY in your .env file')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
