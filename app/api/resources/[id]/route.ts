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

    // Verify PIN (you might want to implement your own PIN verification logic)
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 })
    }

    // Delete the resource
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', params.id)

    if (deleteError) throw deleteError

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
    const { title, url, description, category_id, image_url } = body

    // Update resource only if it belongs to this tenant
    const { data, error } = await supabase
      .from('resources')
      .update({ title, url, description, category_id, image_url })
      .eq('id', params.id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
