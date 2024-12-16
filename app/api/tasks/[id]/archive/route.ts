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

    console.log('Task data after update:', data)

    // Fetch the tenant and assignee data separately
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, avatar_url')
      .eq('id', data.tenant_id)
      .single()

    if (tenantError) {
      console.error('Tenant fetch error:', tenantError)
    }
    console.log('Tenant data:', tenant)

    const { data: assignee, error: assigneeError } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', data.assignee_id)
      .single()

    if (assigneeError) {
      console.error('Assignee fetch error:', assigneeError)
    }
    console.log('Assignee data:', assignee)

    // Combine all the data
    const responseData = {
      ...data,
      tenant_name: tenant?.name,
      tenant_avatar_url: tenant?.avatar_url,
      assignee: data.assignee,
      assignee_avatar_url: assignee?.avatar_url,
      assignee_id: data.assignee_id
    }

    // Add debug logging
    console.log('Assignee avatar URL:', assignee?.avatar_url)
    console.log('Final response data:', responseData)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
