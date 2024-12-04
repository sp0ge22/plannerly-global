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

    // Get tenant_id
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

    // Fetch resources and categories for this tenant
    const [resourcesResponse, categoriesResponse] = await Promise.all([
      supabase.from('resources')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase.from('resource_categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true })
    ])

    if (resourcesResponse.error) throw resourcesResponse.error
    if (categoriesResponse.error) throw categoriesResponse.error

    return NextResponse.json({
      resources: resourcesResponse.data,
      categories: categoriesResponse.data
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

    // Get tenant_id
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

    const body = await request.json()
    const { title, url, description, category_id } = body

    const { data, error } = await supabase
      .from('resources')
      .insert([{ 
        title, 
        url, 
        description, 
        category_id,
        tenant_id: tenantId
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
