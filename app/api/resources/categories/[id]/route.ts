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
