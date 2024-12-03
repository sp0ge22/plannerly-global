import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// Initialize the service role client outside the handler
const serviceRoleClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    // Create regular client for admin check
    const supabase = createRouteHandlerClient({ cookies })

    // Verify the requesting user is an admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminCheck, error: adminError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (adminError || !adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create new invite record
    const { error: inviteError } = await serviceRoleClient
      .from('invites')
      .insert([{
        email: email.toLowerCase(),
        invited_by: session.user.id,
        used: false,
        created_at: new Date().toISOString()
      }])

    if (inviteError) throw inviteError

    // Send signup link via email
    const { error: signupError } = await serviceRoleClient.auth.admin.inviteUserByEmail(email)
    if (signupError) throw signupError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Create user error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create user'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
