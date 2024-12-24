import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

async function ensureTenantExists(userId: string, userEmail: string) {
  // Check if user already has a tenant relationship
  const { data: existingUserTenant, error: userTenantCheckError } = await serviceRoleClient
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', userId)
    .single()

  if (existingUserTenant) {
    return true
  }

  // Create new tenant
  const organizationName = `${userEmail}'s Organization`
  const { data: newTenant, error: tenantError } = await serviceRoleClient
    .from('tenants')
    .insert([{ name: organizationName }])
    .select('id')
    .single()

  if (tenantError || !newTenant) {
    console.error('Failed to create tenant:', tenantError)
    return false
  }

  // Link user to tenant
  const { error: userTenantError } = await serviceRoleClient
    .from('user_tenants')
    .insert([{
      user_id: userId,
      tenant_id: newTenant.id,
      is_owner: true
    }])

  if (userTenantError) {
    console.error('Failed to link user to tenant:', userTenantError)
    return false
  }

  return true
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Handle JWT expiration error
    if (error?.message?.includes('JWT expired')) {
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }
      
      const redirectUrl = new URL('/', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If there's no session and the path isn't public, redirect to landing
    if (!session) {
      const publicPaths = ['/', '/login', '/signup', '/reset-password', '/auth/callback']
      const isPublicPath = publicPaths.includes(req.nextUrl.pathname) || req.nextUrl.pathname.startsWith('/auth/')
      
      if (!isPublicPath) {
        const redirectUrl = new URL('/', req.url)
        return NextResponse.redirect(redirectUrl)
      }
      return res
    }

    // If user is authenticated, check if they have a tenant
    if (session.user) {
      const { data: userTenant } = await serviceRoleClient
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .single()

      if (!userTenant && !req.nextUrl.pathname.startsWith('/auth/')) {
        // No tenant found, try to create one
        const success = await ensureTenantExists(session.user.id, session.user.email || '')
        if (!success) {
          // If tenant creation failed, redirect to error page
          return NextResponse.redirect(new URL('/auth/error?message=tenant_creation_failed', req.url))
        }
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }
}

// Specify which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
