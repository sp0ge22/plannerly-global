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

    const { name } = await request.json()
    console.log('Attempting to create category with name:', name)

    // Check if category already exists within this tenant
    const { data: existingCategory, error: checkError } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('name', name)
      .eq('tenant_id', tenantId)
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
      .insert([{ name, tenant_id: tenantId }])
      .select('*')
      .single()

    if (insertError) {
      console.error('Error inserting category:', insertError)
      throw insertError
    }

    if (!newCategory) {
      throw new Error('No data returned from insert')
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

    const { data, error } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
