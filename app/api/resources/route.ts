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

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user's tenants
    const { data: userTenantsData, error: userTenantsQueryError } = await supabase
      .from('user_tenants')
      .select('*')
      .eq('user_id', session.user.id)

    if (userTenantsQueryError) {
      throw userTenantsQueryError
    }

    // Get resources
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
      .in('tenant_id', userTenantsData.map(ut => ut.tenant_id))

    if (resourcesError) {
      throw resourcesError
    }

    // Get categories
    const { data: categories, error: categoriesError } = await supabase
      .from('resource_categories')
      .select('*')
      .in('tenant_id', userTenantsData.map(ut => ut.tenant_id))

    if (categoriesError) {
      throw categoriesError
    }

    // Get tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .in('id', userTenantsData.map(ut => ut.tenant_id))

    if (tenantsError) {
      throw tenantsError
    }

    return new Response(
      JSON.stringify({
        resources,
        categories,
        tenants,
        userTenants: userTenantsData,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/resources:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get user's tenants
    const { data: userTenantsForPost, error: userTenantsPostError } = await supabase
      .from('user_tenants')
      .select('*')
      .eq('user_id', session.user.id)

    if (userTenantsPostError) {
      throw userTenantsPostError
    }

    const body = await request.json()

    // Validate tenant access
    if (!userTenantsForPost.some(ut => ut.tenant_id === body.tenant_id)) {
      return new Response(JSON.stringify({ error: 'Unauthorized tenant access' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Create resource data without created_by
    const resourceData: {
      title: string
      url: string
      description: string | null
      category_id: number | null
      image_url: string | null
      tenant_id: string
      created_by?: string
    } = {
      title: body.title,
      url: body.url,
      description: body.description || null,
      category_id: body.category_id,
      image_url: body.image_url,
      tenant_id: body.tenant_id
    }

    // Check if created_by column exists
    try {
      const { data: hasCreatedBy } = await supabase
        .from('resources')
        .select('created_by')
        .limit(1)
      
      if (hasCreatedBy !== null) {
        resourceData.created_by = session.user.id
      }
    } catch (error) {
      // Column doesn't exist, proceed without it
      console.log('created_by column not found, skipping...')
    }

    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .insert([resourceData])
      .select(`
        *,
        tenant:tenants (
          id,
          name,
          avatar_url
        )
      `)
      .single()

    if (resourceError) {
      throw resourceError
    }

    return new Response(JSON.stringify(resource), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in POST /api/resources:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { id, pin } = await request.json()

    // Get the resource to check tenant_id
    const { data: resource, error: resourceError } = await supabase
      .from('resources')
      .select('tenant_id')
      .eq('id', id)
      .single()

    if (resourceError || !resource) {
      console.error('Resource lookup error:', resourceError)
      return new Response(
        JSON.stringify({ error: 'Resource not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has access and PIN
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('pin')
      .eq('id', resource.tenant_id)
      .single()

    if (tenantError || !tenant) {
      console.error('Tenant lookup error:', tenantError)
      return new Response(
        JSON.stringify({ error: 'Could not verify organization' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (tenant.pin !== pin) {
      return new Response(
        JSON.stringify({ error: 'Invalid PIN' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // First, delete any references in tenant_resource_templates
    const { error: templateDeleteError } = await supabase
      .from('tenant_resource_templates')
      .delete()
      .match({ resource_id: id })

    if (templateDeleteError) {
      console.error('Error deleting template reference:', templateDeleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete resource reference' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Then delete the resource
    const { error: deleteError } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting resource:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete resource' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in DELETE /api/resources:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
