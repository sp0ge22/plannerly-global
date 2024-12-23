import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  try {
    // Try to refresh the session first
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Handle JWT expiration or other auth errors
    if (error?.message?.includes('JWT') || error?.message?.includes('expired')) {
      console.error('JWT error:', error)
      // For API routes, return 401 response
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication expired', code: 'AUTH_EXPIRED' },
          { status: 401 }
        )
      }
      // For page routes, redirect to landing
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth/callback']
    const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname)

    // If user is logged in and trying to access public routes, redirect to home
    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL('/home', req.url))
    }

    // If user is not logged in and trying to access protected routes
    if (!session && !isPublicRoute) {
      // For API routes, return 401 response
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }
      // For page routes, redirect to landing
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Redirect all auth routes to root
    const restrictedAuthPaths = ['/auth/signup', '/auth/verify', '/auth/login']
    if (restrictedAuthPaths.includes(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  } catch (error) {
    console.error('Session error:', error)
    // For API routes, return 401 response
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication error', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }
    // For page routes, redirect to landing if not on a public route
    const isPublicRoute = ['/', '/auth/callback'].includes(req.nextUrl.pathname)
    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return res
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
    '/api/:path*',  // Add API routes to the matcher
    '/auth/signup',
    '/auth/verify',
    '/auth/login',
  ],
}
