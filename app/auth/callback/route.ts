export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
}

// Create a service role client for guaranteed insert permissions
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

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (!code) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      console.error('No session or user found:', sessionError)
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const userId = session.user.id
    const userEmail = session.user.email

    // Ensure profile exists
    const { data: existingProfile, error: profileSelectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileSelectError && profileSelectError.code !== 'PGRST116') {
      // PGRST116 means no rows found. If it's another error, log it.
      console.error('Error selecting profile:', profileSelectError)
    }

    if (!existingProfile) {
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: userEmail,
          avatar_color: 'bg-red-600',
          avatar_letter: 'U',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }])

      if (profileInsertError) {
        console.error('Error creating profile:', profileInsertError)
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
    }

    // Now create a tenant if one doesn't exist for this user
    // (Assuming each user should have one tenant. If not, adjust logic accordingly)
    // We'll use the serviceRoleClient to ensure no permission issues.

    const tenantName = userEmail ? `${userEmail}'s Tenant` : 'New Tenant'

    const { data: newTenant, error: tenantError } = await serviceRoleClient
      .from('tenants')
      .insert([{ name: tenantName }])
      .select('id')
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
    } else {
      // Link the user to the tenant
      const { error: userTenantError } = await serviceRoleClient
        .from('user_tenants')
        .insert([{
          user_id: userId,
          tenant_id: newTenant.id,
          is_owner: true
        }])

      if (userTenantError) {
        console.error('Error linking user to tenant:', userTenantError)
      } else {
        console.log('Tenant created and linked successfully:', newTenant)
      }
    }

    // Redirect to home page
    return NextResponse.redirect(new URL('/home', request.url))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
