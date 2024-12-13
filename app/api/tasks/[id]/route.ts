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
    if (isNaN(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 })
    }

    const updatedTask = await request.json()

    const statusMap: { [key: string]: string } = {
      'To Do': 'To Do',
      'In Progress': 'In Progress',
      'Completed': 'Done',
      'Done': 'Done'
    }

    const updateData = {
      title: updatedTask.title,
      body: updatedTask.body,
      status: statusMap[updatedTask.status] || updatedTask.status,
      assignee: updatedTask.assignee,
      priority: updatedTask.priority,
      due: updatedTask.due,
      updated_at: new Date().toISOString()
    }

    // Ensure we're only updating tasks in the user's tenant
    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('tenant_id', tenantId)
      .select('*, comments(*)')
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

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const { pin } = await request.json()
    if (pin !== '0220') {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 })
    }

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

    // Now delete the task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('tenant_id', taskCheck.tenant_id)

    if (deleteError) {
      console.error('Error deleting task:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Task deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
