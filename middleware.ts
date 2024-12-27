import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Track refresh attempts to prevent infinite loops
const refreshAttempts = new Map<string, { count: number; lastAttempt: number }>()

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  try {
    // Get session and refresh token if needed
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Rate limit check for token refresh
    const authToken = req.cookies.get('supabase-auth-token')?.value
    const clientId = authToken || req.ip || 'unknown'
    const now = Date.now()
    const attempts = refreshAttempts.get(clientId)

    if (attempts) {
      // Reset if last attempt was more than 5 minutes ago
      if (now - attempts.lastAttempt > 5 * 60 * 1000) {
        refreshAttempts.delete(clientId)
      }
      // Rate limit if too many attempts
      else if (attempts.count > 5) {
        return NextResponse.json(
          { error: 'Too many refresh attempts. Please try again later.' },
          { status: 429 }
        )
      }
    }

    // Handle JWT expiration error
    if (error?.message?.includes('JWT expired')) {
      // Track refresh attempt
      refreshAttempts.set(clientId, {
        count: (attempts?.count || 0) + 1,
        lastAttempt: now
      })

      // If the request is an API request, return 401
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Session expired' },
          { status: 401 }
        )
      }
      
      // For non-API requests, redirect to the landing page
      const redirectUrl = new URL('/', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If there's no session and the path isn't public, redirect to landing
    if (!session) {
      const publicPaths = ['/', '/login', '/signup', '/reset-password']
      const isPublicPath = publicPaths.includes(req.nextUrl.pathname)
      
      if (!isPublicPath) {
        const redirectUrl = new URL('/', req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    
    // If there's an error, treat it as an unauthorized request
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
