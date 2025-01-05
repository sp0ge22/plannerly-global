// app/auth/callback/route.ts (or wherever your callback route is)
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define type for loggable data
type LoggableData = Record<string, unknown>

// A simple logging function that works in Edge
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
    const redirect = requestUrl.searchParams.get('redirect')
    const type = requestUrl.searchParams.get('type')

    log('Callback received request', { 
      url: request.url,
      code: code ? code.substring(0, 8) + '...' : 'none',
      redirect,
      type,
      allParams: Object.fromEntries(requestUrl.searchParams)
    })

    // If there's no ?code=, we can't exchange for a session
    if (!code) {
      log('No code provided in callback')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the Supabase code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      log('Error exchanging code for session', { error: exchangeError })
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Check if user is actually logged in now
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      log('Session error or no user found', { error: sessionError })
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // If it's a brand-new signup or if `?redirect=verify`, go to success
    if (type === 'signup' || redirect === 'verify') {
      log('Signup verification detected', { 
        type,
        redirect,
        condition1: type === 'signup',
        condition2: redirect === 'verify',
        redirectUrl: new URL('/auth/verify-success', request.url).toString()
      })
      const redirectResponse = NextResponse.redirect(new URL('/auth/verify-success', request.url))
      log('Created redirect response', { 
        status: redirectResponse.status,
        headers: Object.fromEntries(redirectResponse.headers.entries())
      })
      return redirectResponse
    }

    // Otherwise, it's a normal login (or password recovery, etc.)
    log('Normal login flow detected', { 
      type,
      redirect,
      redirectUrl: new URL('/settings', request.url).toString()
    })
    return NextResponse.redirect(new URL('/settings', request.url))
  } catch (error) {
    log('Unhandled error in auth callback', { error })
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
