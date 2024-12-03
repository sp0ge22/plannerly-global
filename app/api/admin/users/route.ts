export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    // Create a cookies instance
    const cookieStore = cookies()
    
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) throw authError

    // Create route handler client with proper typing
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Get all permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('*')

    if (permissionsError) throw permissionsError

    // Get profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')

    if (profilesError) throw profilesError

    const usersWithPermissions = users.map(user => {
      const profile = profiles?.find(p => p.id === user.id)
      return {
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        full_name: profile?.full_name || '',
        is_admin: profile?.is_admin || false,
        permissions: permissions
          ?.filter(p => p.user_id === user.id)
          .map(p => p.assignee) || []
      }
    })

    return NextResponse.json(usersWithPermissions)
  } catch (error) {
    console.error('Error in users route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
