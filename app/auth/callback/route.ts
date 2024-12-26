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

// Add a logging function that will show in Vercel
const log = (message: string, data?: any) => {
  const timestamp = new Date().toISOString()
  const logData = data ? `\nData: ${JSON.stringify(data, null, 2)}` : ''
  console.log(`[${timestamp}] ${message}${logData}`)
  
  // Also log to Vercel's system logs
  if (process.env.VERCEL) {
    // @ts-ignore
    process.stdout.write(`[${timestamp}] ${message}${logData}\n`)
  }
}

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (!code) {
      log('No code provided in callback')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    log('Starting auth callback process', { code: code.substring(0, 8) + '...' })

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      log('Error exchanging code for session', { error: exchangeError })
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      log('Session error or no user found', { error: sessionError })
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const userId = session.user.id
    const userEmail = session.user.email
    log('User authenticated successfully', { userId, userEmail })

    // Ensure profile exists
    const { data: existingProfile, error: profileSelectError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    log('Checking for existing profile', { 
      hasProfile: !!existingProfile,
      error: profileSelectError 
    })

    if (profileSelectError && profileSelectError.code !== 'PGRST116') {
      // PGRST116 means no rows found. If it's another error, log it.
      log('Error checking for profile', { error: profileSelectError })
    }

    if (!existingProfile) {
      log('Creating new profile', { userId, userEmail })
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
        log('Error creating profile', { error: profileInsertError })
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
      log('Profile created successfully')
    }

    // Check if user already has a tenant relationship
    const { data: existingUserTenant, error: userTenantCheckError } = await serviceRoleClient
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .single()

    log('Checked existing tenant relationship', { 
      existingUserTenant, 
      error: userTenantCheckError,
      userId 
    })

    if (userTenantCheckError && userTenantCheckError.code !== 'PGRST116') {
      log('Error checking user tenant', { error: userTenantCheckError })
    }

    // Only create tenant and relationship if one doesn't exist
    if (!existingUserTenant) {
      log('No existing tenant found, starting tenant creation')
      
      // Get the organization name from user metadata if it exists
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        log('Error getting user for tenant creation', { error: userError })
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      const organizationName = user?.user_metadata?.organization_name || `${userEmail}'s Organization`
      log('Creating new tenant', { organizationName })

      // Create new tenant
      const { data: newTenant, error: tenantError } = await serviceRoleClient
        .from('tenants')
        .insert([{ name: organizationName }])
        .select('id')
        .single()

      log('Tenant creation completed', { 
        success: !!newTenant,
        error: tenantError,
        tenantId: newTenant?.id 
      })

      if (tenantError) {
        log('Failed to create tenant', { error: tenantError })
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      if (!newTenant) {
        log('No tenant created - unexpected state')
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      log('Creating user-tenant relationship', {
        userId,
        tenantId: newTenant.id
      })

      // Link the user to the tenant
      const { error: userTenantError } = await serviceRoleClient
        .from('user_tenants')
        .insert([{
          user_id: userId,
          tenant_id: newTenant.id,
          is_owner: true
        }])

      if (userTenantError) {
        log('Failed to create user-tenant relationship', { error: userTenantError })
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      log('User-tenant relationship created successfully')
    }

    log('Auth callback completed successfully, redirecting to tasks')
    return NextResponse.redirect(new URL('/tasks', request.url))
  } catch (error) {
    log('Unhandled error in auth callback', { error })
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
