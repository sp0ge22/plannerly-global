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

    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .single()

    if (userTenantError || !userTenant) {
      console.error('User tenant lookup error:', userTenantError)
      return NextResponse.json({ error: 'Could not determine tenant' }, { status: 403 })
    }

    const tenantId = userTenant.tenant_id
    const taskId = parseInt(params.id, 10)
    const { text, author } = await request.json()

    // Ensure the task belongs to the user's tenant
    const { data: taskCheck, error: taskCheckError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .single()

    if (taskCheckError || !taskCheck) {
      console.error('Task not found in tenant:', taskCheckError)
      return NextResponse.json({ error: 'Task not found or not accessible' }, { status: 404 })
    }

    // Insert comment without tenant_id column
    const { data, error } = await supabase
      .from('comments')
      .insert({ 
        task_id: taskId, 
        text, 
        author,
        user_id: session.user.id
      })
      .select('*')

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
