import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email, password, accessKey } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    // Verify invite is valid
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select()
      .eq('email', email.toLowerCase())
      .eq('access_key', accessKey)
      .single()

    if (inviteError || !invite || invite.used) {
      return NextResponse.json(
        { error: 'Invalid invite' },
        { status: 400 }
      )
    }

    // Create the auth user
    const { data: authData, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // This automatically confirms the email
    })

    if (signUpError) throw signUpError

    // Create the profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
        is_admin: false
      }])

    if (profileError) throw profileError

    // Mark invite as used
    const { error: inviteError2 } = await supabase
      .from('invites')
      .update({ used: true })
      .eq('email', email)
      .eq('access_key', accessKey)

    if (inviteError2) throw inviteError2

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Signup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
