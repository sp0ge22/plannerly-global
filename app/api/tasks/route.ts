import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
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
    const task = await request.json()
    console.log('Received task:', task)

    if (!task.title || !task.body || !task.priority) {
      return NextResponse.json({ error: 'Title, body, and priority are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        ...task,
        tenant_id: tenantId,
        status: task.status || 'To Do', 
        assignee: task.assignee || 'Unassigned',
        due: task.due || null,
        user_id: session.user.id
      }])
      .select()

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

export async function GET() {
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

    // Get user's profile to check if admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()

    if (profileError) {
      console.error('Profile error:', profileError)
      return NextResponse.json({ error: 'User not allowed' }, { status: 403 })
    }

    console.log('User profile:', profile)

    // Get user's permissions
    const { data: permissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select('assignee')
      .eq('user_id', session.user.id)

    if (permissionsError) {
      console.error('Permissions error:', permissionsError)
      return NextResponse.json({ error: permissionsError.message }, { status: 500 })
    }

    console.log('User permissions:', permissions)

    let query = supabase.from('tasks').select('*').eq('tenant_id', tenantId)

    if (!profile?.is_admin) {
      const allowedAssignees = permissions?.map(p => p.assignee) || []
      
      // Only apply filtering if there are explicit permissions set
      if (allowedAssignees.length > 0) {
        console.log('Restricting by allowed assignees:', allowedAssignees)
        query = query.in('assignee', allowedAssignees)
      } else {
        console.log('No explicit permissions, showing all tenant tasks.')
      }
    }

    const { data: tasks, error: tasksError } = await query.order('created_at', { ascending: false })

    if (tasksError) {
      console.error('Tasks error:', tasksError)
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }

    console.log('Tasks found:', tasks?.length)

    // Fetch comments for the retrieved tasks
    // Since we rely on tasks for tenant filtering,
    // we don't need tenant_id on comments.
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .in('task_id', tasks.map(t => t.id))
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Comments error:', commentsError)
      return NextResponse.json({ error: commentsError.message }, { status: 500 })
    }

    const tasksWithComments = tasks.map(task => ({
      ...task,
      comments: comments?.filter(comment => comment.task_id === task.id) || []
    }))

    return NextResponse.json(tasksWithComments)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
