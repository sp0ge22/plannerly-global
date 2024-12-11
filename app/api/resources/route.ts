import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get all tenant IDs the user is a member of
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)

    if (userTenantsError) {
      console.error('User tenants lookup error:', userTenantsError)
      return NextResponse.json({ error: 'Could not determine tenants' }, { status: 403 })
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id)

    // Fetch resources and categories for all tenants
    const [resourcesResponse, categoriesResponse, tenantsResponse] = await Promise.all([
      supabase.from('resources')
        .select('*')
        .in('tenant_id', tenantIds)
        .order('created_at', { ascending: false }),
      supabase.from('resource_categories')
        .select('*')
        .in('tenant_id', tenantIds)
        .order('name', { ascending: true }),
      supabase.from('tenants')
        .select('id, name')
        .in('id', tenantIds)
    ])

    if (resourcesResponse.error) throw resourcesResponse.error
    if (categoriesResponse.error) throw categoriesResponse.error
    if (tenantsResponse.error) throw tenantsResponse.error

    return NextResponse.json({
      resources: resourcesResponse.data,
      categories: categoriesResponse.data,
      tenants: tenantsResponse.data
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
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
    const { title, url, description, category_id, tenant_id } = body

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

    const { data, error } = await supabase
      .from('resources')
      .insert([{ 
        title, 
        url, 
        description, 
        category_id,
        tenant_id
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
