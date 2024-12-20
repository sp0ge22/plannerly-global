import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Read request body once
    const { name, tenant_id: initialTenantId } = await request.json()
    let tenant_id = initialTenantId

    // If tenant_id is provided, verify user has access to it
    if (tenant_id) {
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
    } else {
      // If no tenant_id provided, get the first tenant_id the user has access to
      const { data: userTenant, error: userTenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      if (userTenantError || !userTenant) {
        console.error('User tenant lookup error:', userTenantError)
        return NextResponse.json({ error: 'Could not determine tenant' }, { status: 403 })
      }

      tenant_id = userTenant.tenant_id
    }

    // Check if category already exists within this tenant
    const { data: existingCategory, error: checkError } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('name', name)
      .eq('tenant_id', tenant_id)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing category:', checkError)
      throw checkError
    }

    if (existingCategory) {
      console.log('Category already exists:', existingCategory)
      return NextResponse.json(existingCategory)
    }

    // Create new category for this tenant
    const { data: newCategory, error: insertError } = await supabase
      .from('resource_categories')
      .insert([{ name, tenant_id }])
      .select('*')
      .single()

    if (insertError) {
      console.error('Error inserting category:', insertError)
      throw insertError
    }

    console.log('Successfully created category:', newCategory)
    return NextResponse.json(newCategory)

  } catch (error) {
    console.error('Error in category creation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}

// Add GET method to fetch categories
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
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

    if (!userTenants || userTenants.length === 0) {
      return NextResponse.json({ error: 'User is not a member of any organization' }, { status: 403 })
    }

    const tenantIds = userTenants.map(ut => ut.tenant_id)

    const { data, error } = await supabase
      .from('resource_categories')
      .select('*')
      .in('tenant_id', tenantIds)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
