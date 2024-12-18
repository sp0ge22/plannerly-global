import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user_id, tenant_id, is_admin } = await request.json()

    if (!user_id || !tenant_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify the current user is an owner of the tenant
    const { data: currentUserTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('is_owner')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (userTenantError || !currentUserTenant) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    if (!currentUserTenant.is_owner) {
      return NextResponse.json({ error: 'Must be an owner to update roles' }, { status: 403 })
    }

    // Update the user's role
    const { error: updateError } = await supabase
      .from('user_tenants')
      .update({ is_admin })
      .eq('user_id', user_id)
      .eq('tenant_id', tenant_id)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Role updated successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
} 