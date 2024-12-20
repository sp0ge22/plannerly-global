import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface Resource {
  id: number
  title: string
  url: string
  description: string | null
  category_id: number | null
  tenant_id: string
  created_at: string
  created_by: string
  image_url: string | null
  tenant?: {
    id: string
    name: string
    avatar_url: string | null
  }
}

export async function GET() {
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

    // Get resources with tenant information
    const { data: resources, error: resourcesError } = await supabase
      .from('resources')
      .select(`
        *,
        tenant:tenants (
          id,
          name,
          avatar_url
        )
      `)
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false })

    if (resourcesError) {
      console.error('Error fetching resources:', resourcesError)
      return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 })
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('resource_categories')
      .select('*')
      .in('tenant_id', tenantIds)
      .order('name')

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    // Get tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, avatar_url')
      .in('id', tenantIds)

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }

    return NextResponse.json({
      resources,
      categories,
      tenants
    })
  } catch (error) {
    console.error('Error in GET /api/resources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { title, url, description, category_id, tenant_id, image_url } = body

    // Verify user has access to the specified tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (userTenantError || !userTenant) {
      console.error('User tenant access error:', userTenantError)
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    // Create resource object, excluding empty category_id
    const resourceData: Partial<Resource> = {
      title,
      url,
      description,
      tenant_id,
      image_url
    }

    // Only add category_id if it's not empty
    if (category_id && category_id !== '') {
      resourceData.category_id = parseInt(category_id)
    }

    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { id, pin } = await request.json()

    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the resource to check tenant_id
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (resourceError || !resource) {
      console.error('Resource lookup error:', resourceError)
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }

    // Verify user has access and PIN
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
      .match({ resource_id: id })

    if (templateDeleteError) {
      console.error('Error deleting template reference:', templateDeleteError)
      return NextResponse.json({ error: 'Failed to delete resource reference' }, { status: 500 })
    }

    // Then delete the resource
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)

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
