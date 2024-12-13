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
    const task = await request.json()
    console.log('Received task:', task)

    if (!task.title || !task.body || !task.priority) {
      return NextResponse.json({ error: 'Title, body, and priority are required' }, { status: 400 })
    }

    // Use the tenant_id provided in the task, or default to the first tenant
    const targetTenantId = task.tenant_id || tenantIds[0]

    // Verify the user has access to this tenant
    if (!tenantIds.includes(targetTenantId)) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    // Get the tenant name and avatar
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, avatar_url')
      .eq('id', targetTenantId)
      .single()

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
      return NextResponse.json({ error: 'Could not fetch organization details' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        ...task,
        tenant_id: targetTenantId,
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

    // Add tenant name and avatar to the response
    const taskWithTenant = {
      ...data[0],
      tenant_name: tenant.name,
      tenant_avatar_url: tenant.avatar_url,
      comments: []
    }

    return NextResponse.json(taskWithTenant)
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

    let query = supabase
      .from('tasks')
      .select('*')
      .in('tenant_id', tenantIds)

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

    // Get tenant names for the tasks
    const uniqueTenantIds = Array.from(new Set(tasks.map(t => t.tenant_id)))
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, avatar_url')
      .in('id', uniqueTenantIds)

    if (tenantsError) {
      console.error('Error fetching tenant names:', tenantsError)
    }

    // Create a map of tenant IDs to names and avatars
    const tenantMap = (tenants || []).reduce((acc, tenant) => {
      acc[tenant.id] = {
        name: tenant.name,
        avatar_url: tenant.avatar_url
      }
      return acc
    }, {} as Record<string, { name: string, avatar_url: string | null }>)

    // Fetch comments for the retrieved tasks
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .in('task_id', tasks.map(t => t.id))
      .order('created_at', { ascending: true })

    if (commentsError) {
      console.error('Comments error:', commentsError)
      return NextResponse.json({ error: commentsError.message }, { status: 500 })
    }

    const tasksWithCommentsAndTenants = tasks.map(task => ({
      ...task,
      tenant_name: tenantMap[task.tenant_id]?.name || 'Unknown Organization',
      tenant_avatar_url: tenantMap[task.tenant_id]?.avatar_url || null,
      comments: comments?.filter(comment => comment.task_id === task.id) || []
    }))

    return NextResponse.json(tasksWithCommentsAndTenants)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
