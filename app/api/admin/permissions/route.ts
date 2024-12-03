export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { Database } from '@/types/supabase'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(request: Request) {
  try {
    const { userId, assignee, action } = await request.json()
    
    if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('assignee', assignee)

      if (error) throw error
    } else {
      const { error } = await supabaseAdmin
        .from('user_permissions')
        .insert({
          user_id: userId,
          assignee: assignee
        })
        .select()
        .single()

      if (error && error.code !== '23505') throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error managing permission:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
