import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user_id, tenant_id } = await request.json()

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
      return NextResponse.json({ error: 'Must be an owner to remove members' }, { status: 403 })
    }

    // Check if target user is an owner
    const { data: targetUserTenant, error: targetError } = await supabase
      .from('user_tenants')
      .select('is_owner')
      .eq('user_id', user_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (targetError) {
      return NextResponse.json({ error: 'Error checking target user' }, { status: 500 })
    }

    if (targetUserTenant.is_owner) {
      return NextResponse.json({ error: 'Cannot remove an owner from the organization' }, { status: 403 })
    }

    // Remove the user from the organization
    const { error: removeError } = await supabase
      .from('user_tenants')
      .delete()
      .eq('user_id', user_id)
      .eq('tenant_id', tenant_id)

    if (removeError) {
      console.error('Error removing member:', removeError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
} 