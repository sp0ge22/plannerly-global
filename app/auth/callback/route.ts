export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define type for loggable data
type LoggableData = Record<string, unknown>

// Add a logging function that will show in Vercel Edge Runtime
const log = (message: string, data?: LoggableData) => {
  const timestamp = new Date().toISOString()
  const logMessage = {
    timestamp,
    message,
    ...data
  }
  console.log(JSON.stringify(logMessage))
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
    const { data: existingUserTenant, error: userTenantCheckError } = await supabase
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

      // Create new tenant using regular supabase client
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([{ name: organizationName }])
        .select('id')
        .single()

      if (tenantError) {
        log('Failed to create tenant', { error: tenantError })
        return NextResponse.redirect(new URL('/auth/error?code=tenant_creation_failed', request.url))
      }

      if (!newTenant) {
        log('No tenant created - unexpected state')
        return NextResponse.redirect(new URL('/auth/error?code=tenant_missing', request.url))
      }

      log('Creating user-tenant relationship', {
        userId,
        tenantId: newTenant.id
      })

      // Link the user to the tenant using regular supabase client
      const { error: userTenantError } = await supabase
        .from('user_tenants')
        .insert([{
          user_id: userId,
          tenant_id: newTenant.id,
          is_owner: true
        }])

      if (userTenantError) {
        log('Failed to create user-tenant relationship', { error: userTenantError })
        // Attempt to clean up the created tenant
        await supabase
          .from('tenants')
          .delete()
          .eq('id', newTenant.id)
        return NextResponse.redirect(new URL('/auth/error?code=tenant_link_failed', request.url))
      }

      log('User-tenant relationship created successfully')
    }

    // Final verification check
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', userId)
      .single()

    if (finalCheckError || !finalCheck) {
      log('Final tenant check failed', { error: finalCheckError })
      return NextResponse.redirect(new URL('/auth/error?code=tenant_verification_failed', request.url))
    }

    // Check if this is an email verification callback
    const redirect = requestUrl.searchParams.get('redirect')
    const next = requestUrl.searchParams.get('next')
    
    if (redirect === 'verify') {
      log('Email verification callback, redirecting to success page')
      return NextResponse.redirect(new URL('/auth/verify-success', request.url))
    }

    log('Auth callback completed successfully, redirecting to settings')
    return NextResponse.redirect(new URL('/settings', request.url))
  } catch (error) {
    log('Unhandled error in auth callback', { error })
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
