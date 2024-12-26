import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
