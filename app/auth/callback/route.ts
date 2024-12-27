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
    const redirect = requestUrl.searchParams.get('redirect')
    const type = requestUrl.searchParams.get('type')

    log('Callback received request', { 
      url: request.url,
      code: code ? code.substring(0, 8) + '...' : 'none',
      redirect,
      type,
      allParams: Object.fromEntries(requestUrl.searchParams)
    })

    if (!code) {
      log('No code provided in callback')
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const supabase = createRouteHandlerClient({ cookies })
    
    // Exchange the code for a session first
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      log('Error exchanging code for session', { error: exchangeError })
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }

    // Get the session to check if this was a signup verification
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      log('Session error or no user found', { error: sessionError })
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // If this was a signup verification or has the verify redirect, show success page
    if (type === 'signup' || redirect === 'verify') {
      log('Signup verification detected, redirecting to success page')
      return NextResponse.redirect(new URL('/auth/verify-success', request.url))
    }

    // Otherwise continue with normal login flow
    log('Normal login flow, redirecting to settings')
    return NextResponse.redirect(new URL('/settings', request.url))
  } catch (error) {
    log('Unhandled error in auth callback', { error })
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
