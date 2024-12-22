import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const DEFAULT_PIN = '0220' // Hardcoded PIN

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // First, get the resource to check its tenant_id
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('tenant_id')
      .eq('id', params.id)
      .single()

    if (resourceError || !resource) {
      console.error('Resource lookup error:', resourceError)
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Check if user has access to this resource's tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', resource.tenant_id)
      .single()

    if (userTenantError || !userTenant) {
      console.error('User tenant access error:', userTenantError)
      return NextResponse.json({ error: 'Not authorized to delete this resource' }, { status: 403 })
    }

    // Get PIN from request body
    const { pin } = await request.json()

    // Verify PIN
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    // Verify the PIN matches the organization's PIN
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('pin')
      .eq('id', resource.tenant_id)
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant lookup error:', tenantError)
      return NextResponse.json({ error: 'Could not verify organization' }, { status: 403 })
    }

    if (tenant.pin !== pin) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
    }

    // First, delete any references in tenant_resource_templates
    const { error: templateDeleteError } = await supabase
      .from('tenant_resource_templates')
      .delete()
      .match({ resource_id: params.id })

    if (templateDeleteError) {
      console.error('Error deleting template reference:', templateDeleteError)
      return NextResponse.json({ error: 'Failed to delete resource reference' }, { status: 500 })
    }

    // Then delete the resource
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error deleting resource:', deleteError)
      return NextResponse.json({ error: 'Failed to delete resource' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { tenant_id, tenant, created_at, created_by, id, ...updateData } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Verify user has admin/owner access to this tenant
    const { data: userTenants, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('*')  // Select all fields to check permissions
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenant_id)

    if (userTenantError) {
      console.error('User tenant lookup error:', userTenantError)
      return NextResponse.json({ error: 'Error verifying tenant access' }, { status: 500 })
    }

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    // Check if user is admin or owner
    const hasPermission = userTenants.some(ut => ut.is_owner || ut.is_admin === true || ut.is_admin === null)
    if (!hasPermission) {
      return NextResponse.json({ error: 'You must be an admin or owner to edit resources' }, { status: 403 })
    }

    // Update resource with cleaned data
    const { data: updatedResource, error: updateError } = await supabase
      .from('resources')
      .update({
        title: updateData.title,
        url: updateData.url,
        description: updateData.description,
        category_id: updateData.category_id,
        image_url: updateData.image_url
      })
      .eq('id', params.id)
      .eq('tenant_id', tenant_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    return NextResponse.json(updatedResource)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 })
  }
}
