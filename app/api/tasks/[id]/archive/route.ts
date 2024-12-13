import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
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
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const { archived } = await request.json()

    // First verify the task belongs to one of the user's tenants
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

    // Update the task using the verified tenant_id
    const { data, error } = await supabase
      .from('tasks')
      .update({ archived })
      .eq('id', taskId)
      .eq('tenant_id', taskCheck.tenant_id)
      .select('*')
      .single()

    if (error) {
      console.error('Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
