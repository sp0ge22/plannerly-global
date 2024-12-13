// app/api/tasks/[id]/comments/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all tenants the user is a member of
    const { data: userTenants, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)

    if (userTenantError) {
      console.error('User tenant lookup error:', userTenantError)
      return NextResponse.json({ error: 'Could not determine tenants' }, { status: 403 })
    }

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'User is not a member of any organization' }, { status: 403 })
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id)
    const taskId = parseInt(params.id, 10)
    const { text, author } = await request.json()

    // Ensure the task belongs to one of the user's tenants
    const { data: taskCheck, error: taskCheckError } = await supabase
      .from('tasks')
      .select('id, tenant_id')
      .eq('id', taskId)
      .in('tenant_id', tenantIds)
      .single()

    if (taskCheckError || !taskCheck) {
      console.error('Task access error:', taskCheckError)
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 403 })
    }

    // Create the comment with the task's tenant_id
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert([{
        task_id: taskId,
        text,
        author,
        user_id: session.user.id,
        tenant_id: taskCheck.tenant_id
      }])
      .select(`
        *,
        profile:user_id (
          avatar_url,
          name
        )
      `)
      .single()

    if (commentError) {
      console.error('Comment creation error:', commentError)
      return NextResponse.json({ error: commentError.message }, { status: 500 })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
