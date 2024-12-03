import { supabase } from './supabase'

export async function initSupabaseTable() {
  try {
    // Create the table if it doesn't exist
    const { error: tableError } = await supabase.rpc('init_tasks_table')
    if (tableError) throw tableError

    // Create the RLS policy if it doesn't exist
    const { error: policyError } = await supabase.rpc('create_tasks_policy')
    if (policyError) throw policyError

    console.log('Tasks table and policy initialized successfully')
  } catch (error) {
    console.error('Error initializing tasks table or policy:', error)
  }
}
