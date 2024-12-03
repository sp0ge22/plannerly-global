import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// For security, avoid logging sensitive information in production
if (process.env.NODE_ENV !== 'production') {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key:', supabaseKey.substring(0, 5) + '...')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
