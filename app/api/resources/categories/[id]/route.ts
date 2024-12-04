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
    const { name, image_url } = body

    // Update category only if it belongs to this tenant
    const { data: updatedCategory, error: categoryError } = await supabase
      .from('resource_categories')
      .update({ name, image_url })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (categoryError) throw categoryError

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
