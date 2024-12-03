import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()
    const supabase = createRouteHandlerClient({ cookies })

    // Verify the requesting user is an admin
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminCheck, error: adminError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (adminError || !adminCheck?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete user from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(userId)
    if (authError) {
      console.error('Auth deletion error:', authError)
      throw authError
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete user error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete user'
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    )
  }
}
