import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// Create a service role client for admin operations
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
    const { email, password, accessKey, organizationName } = await request.json()

    console.log('Received request for signup with:', { email, accessKey })

    // Check the invite
    const { data: invite, error: inviteError } = await serviceRoleClient
      .from('invites')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('access_key', accessKey)
      .single()

    console.log('Invite check:', { invite, inviteError })

    if (inviteError || !invite || invite.used) {
      console.error('Invalid invite or already used:', inviteError)
      return NextResponse.json({ error: 'Invalid invite' }, { status: 400 })
    }

    // Create the auth user
    const { data: authData, error: signUpError } = await serviceRoleClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    console.log('authData after createUser:', authData)
    console.log('signUpError:', signUpError)

    if (signUpError) throw signUpError
    if (!authData?.user?.id) throw new Error('No user ID returned after createUser')

    const userId = authData.user.id
    console.log('New user ID:', userId)

    // Verify user in auth.users (optional check)
    const { data: userCheck, error: userCheckError } = await serviceRoleClient
      .from('auth.users')
      .select('id')
      .eq('id', userId)
      .single()

    console.log('Check user in auth.users:', { userCheck, userCheckError })
    if (userCheckError || !userCheck) throw new Error('User not found in auth.users after creation.')

    // Create the profile record
    const { data: profileData, error: profileError } = await serviceRoleClient
      .from('profiles')
      .insert([{
        id: userId,
        email: email.toLowerCase(),
        created_at: new Date().toISOString(),
        is_admin: false
      }])
      .select('*')
      .single()

    console.log('Profile insert:', { profileData, profileError })
    if (profileError) throw profileError

    // Create a tenant for the new user with the provided organization name
    const tenantName = organizationName?.trim() || `${email.toLowerCase()}'s Organization`
    const { data: tenantData, error: tenantError } = await serviceRoleClient
      .from('tenants')
      .insert([{ name: tenantName }])
      .select('id')
      .single()

    console.log('Tenant insert:', { tenantData, tenantError })
    if (tenantError) throw tenantError
    if (!tenantData?.id) throw new Error('Tenant creation returned no ID.')

    // Link user to tenant as owner
    const { data: userTenantData, error: userTenantError } = await serviceRoleClient
      .from('user_tenants')
      .insert([{
        user_id: userId,
        tenant_id: tenantData.id,
        is_owner: true
      }])
      .select('*')

    console.log('user_tenants insert:', { userTenantData, userTenantError })
    if (userTenantError) throw userTenantError

    // Mark invite as used
    const { data: inviteUpdateData, error: inviteError2 } = await serviceRoleClient
      .from('invites')
      .update({ used: true })
      .eq('email', email)
      .eq('access_key', accessKey)
      .select('*')

    console.log('Invite update:', { inviteUpdateData, inviteError2 })
    if (inviteError2) throw inviteError2

    console.log('Signup completed successfully for:', { userId, tenantId: tenantData.id })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Signup error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create account'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
