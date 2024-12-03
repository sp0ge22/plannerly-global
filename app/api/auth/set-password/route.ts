import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

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
    const { email, password, accessKey } = await request.json()

    // Verify invite is valid
    const { data: invite, error: inviteError } = await serviceRoleClient
      .from('invites')
      .select()
      .eq('email', email.toLowerCase())
      .eq('access_key', accessKey)
      .single()

    if (inviteError || !invite || invite.used) {
      return NextResponse.json(
        { error: 'Invalid or used invite' },
        { status: 400 }
      )
    }

    // Create the auth user
    const { data: authData, error: createUserError } = await serviceRoleClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createUserError) throw createUserError

    // Create the profile
    const { error: profileError } = await serviceRoleClient
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
        is_admin: false
      }])

    if (profileError) throw profileError

    // Mark invite as used
    const { error: updateError } = await serviceRoleClient
      .from('invites')
      .update({ used: true })
      .eq('email', email)
      .eq('access_key', accessKey)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Set password error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to set password'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
