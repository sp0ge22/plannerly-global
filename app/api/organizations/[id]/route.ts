import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { pin, confirmName } = await request.json()
    const orgId = params.id

    // Initialize supabase client
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get organization details and verify ownership
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('name, pin')
      .eq('id', orgId)
      .single()

    if (tenantError) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Verify organization name matches
    if (tenant.name !== confirmName) {
      return NextResponse.json(
        { error: 'Organization name does not match' },
        { status: 403 }
      )
    }

    // Verify PIN
    if (tenant.pin !== pin) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 403 }
      )
    }

    // Check if user is owner of this org
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('is_owner')
      .eq('user_id', session.user.id)
      .eq('tenant_id', orgId)
      .single()

    if (userTenantError || !userTenant?.is_owner) {
      return NextResponse.json(
        { error: 'Only organization owners can delete organizations' },
        { status: 403 }
      )
    }

    // Count how many orgs the user owns
    const { data: ownedOrgs, error: ownedOrgsError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('is_owner', true)

    if (ownedOrgsError) {
      return NextResponse.json(
        { error: 'Failed to verify organization ownership' },
        { status: 500 }
      )
    }

    if (ownedOrgs.length <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete your only organization. Create another organization first.' },
        { status: 400 }
      )
    }

    // Delete the organization (this will cascade to user_tenants due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', orgId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to delete organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting organization:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 