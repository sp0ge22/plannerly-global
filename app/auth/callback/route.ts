// Add this export to mark the route as dynamic
export const dynamic = 'force-dynamic'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
      const supabase = createRouteHandlerClient({ cookies })
      
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)

      // Get the user's session
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Check if we need to create a profile
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select()
          .eq('id', session.user.id)
          .single()

        if (!existingProfile) {
          // Create profile if it doesn't exist
          await supabase
            .from('profiles')
            .insert([
              {
                id: session.user.id,
                email: session.user.email,
                avatar_color: 'bg-red-600',
                avatar_letter: 'U',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            ])
        }

        // Redirect to home page
        return NextResponse.redirect(new URL('/home', request.url))
      }
    }

    // If something goes wrong, redirect to login
    return NextResponse.redirect(new URL('/auth/login', request.url))
  } catch (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}
