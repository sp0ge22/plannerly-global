import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's tenant relationships including role information
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        is_owner,
        is_admin
      `)
      .eq('user_id', session.user.id)

    if (userTenantsError) {
      console.error('Error fetching user tenants:', userTenantsError)
      return NextResponse.json({ error: 'Failed to fetch user organizations' }, { status: 500 })
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id)

    // Get tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, avatar_url')
      .in('id', tenantIds)

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // Get templates and categories
    const [templatesResponse, categoriesResponse] = await Promise.all([
      supabase
        .from('resource_templates')
        .select(`
          *,
          category:resource_template_categories (
            id,
            name,
            description,
            image_url
          )
        `)
        .order('title'),
      supabase
        .from('resource_template_categories')
        .select('*')
        .order('sort_order')
    ])

    if (templatesResponse.error) {
      console.error('Error fetching templates:', templatesResponse.error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    if (categoriesResponse.error) {
      console.error('Error fetching categories:', categoriesResponse.error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }

    return NextResponse.json({
      templates: templatesResponse.data,
      categories: categoriesResponse.data,
      tenants,
      userTenants
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 