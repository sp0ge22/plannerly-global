import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Public routes that don't require authentication
    const publicRoutes = ['/', '/auth/callback']
    const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname)

    // If user is logged in and trying to access public routes, redirect to home
    if (session && isPublicRoute) {
      return NextResponse.redirect(new URL('/home', req.url))
    }

    // If user is not logged in and trying to access protected routes, redirect to root
    if (!session && !isPublicRoute) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Redirect all auth routes to root
    const restrictedAuthPaths = ['/auth/signup', '/auth/verify', '/auth/login']
    if (restrictedAuthPaths.includes(req.nextUrl.pathname)) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  } catch (error) {
    // If there's any error with the session, treat user as logged out
    console.error('Session error:', error)
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
    '/auth/signup',
    '/auth/verify',
    '/auth/login',
  ],
}
