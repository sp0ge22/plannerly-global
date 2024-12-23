import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const { name, image_url, tenant_id } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Verify user has access to this tenant
    const { data: userTenants, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenant_id)

    if (userTenantError) {
      console.error('User tenant lookup error:', userTenantError)
      return NextResponse.json({ error: 'Error verifying tenant access' }, { status: 500 })
    }

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    // Update category only if it belongs to this tenant
    const { data: updatedCategory, error: categoryError } = await supabase
      .from('resource_categories')
      .update({ name, image_url })
      .eq('id', params.id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (categoryError) throw categoryError

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
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
    const { tenant_id } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Verify user has admin/owner access to this tenant
    const { data: userTenants, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenant_id)

    if (userTenantError) {
      console.error('User tenant lookup error:', userTenantError)
      return NextResponse.json({ error: 'Error verifying tenant access' }, { status: 500 })
    }

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    const userTenant = userTenants[0]
    if (!userTenant.is_owner && userTenant.is_admin !== true && userTenant.is_admin !== null) {
      return NextResponse.json({ error: 'Must be an admin or owner to delete categories' }, { status: 403 })
    }

    // Check if any resources are using this category
    const { data: resources, error: resourceError } = await supabase
      .from('resources')
      .select('id')
      .eq('category_id', params.id)

    if (resourceError) {
      console.error('Resource check error:', resourceError)
      return NextResponse.json({ error: 'Error checking resource usage' }, { status: 500 })
    }

    if (resources && resources.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete category that has resources. Remove all resources first.' 
      }, { status: 400 })
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('resource_categories')
      .delete()
      .eq('id', params.id)
      .eq('tenant_id', tenant_id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal Server Error' 
    }, { status: 500 })
  }
}
