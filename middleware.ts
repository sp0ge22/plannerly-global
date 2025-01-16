// middleware.ts

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Track refresh attempts to prevent infinite loops
const refreshAttempts = new Map<string, { count: number; lastAttempt: number }>()

// Debug logging for token refresh attempts
function logRefreshAttempt(clientId: string, attempts: number) {
  console.log(`Token refresh attempt for client ${clientId.substring(0, 8)}... Count: ${attempts}`)
}

export async function middleware(req: NextRequest) {
  // Skip middleware for static files and certain paths
  if (
    req.nextUrl.pathname.startsWith('/_next') ||
    req.nextUrl.pathname.startsWith('/static') ||
    req.nextUrl.pathname.startsWith('/api/public')
  ) {
    return NextResponse.next()
  }

  const res = NextResponse.next()
  res.headers.set('x-pathname', req.nextUrl.pathname)
  
  const supabase = createMiddlewareClient({ req, res })

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    // Only proceed with refresh logic if there's an actual error
    if (error?.message?.includes('JWT expired')) {
      const authToken = req.cookies.get('supabase-auth-token')?.value
      const clientId = authToken || req.ip || 'unknown'
      const now = Date.now()
      const attempts = refreshAttempts.get(clientId)

      // Reset if last attempt was more than 15 minutes ago
      if (attempts && now - attempts.lastAttempt > 15 * 60 * 1000) {
        refreshAttempts.delete(clientId)
      }

      // Rate limit if more than 10 attempts in 15 minutes
      if (attempts && attempts.count > 10) {
        logRefreshAttempt(clientId, attempts.count)
        return NextResponse.json(
          { error: 'Too many refresh attempts. Please try again later.' },
          { status: 429 }
        )
      }

      // Track refresh attempt
      const newCount = (attempts?.count || 0) + 1
      refreshAttempts.set(clientId, {
        count: newCount,
        lastAttempt: now
      })
      logRefreshAttempt(clientId, newCount)

      // Handle expired sessions
      if (req.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 })
      }
      
      const redirectUrl = new URL('/', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return res
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
     * - public folder or publicly accessible assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
