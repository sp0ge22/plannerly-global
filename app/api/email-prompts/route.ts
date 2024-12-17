import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenants
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

    // Get prompts with tenant and creator info
    const { data: prompts, error: promptsError } = await supabase
      .from('email_prompts')
      .select(`
        *,
        tenant:tenants (
          name,
          avatar_url
        ),
        creator:profiles (
          name,
          avatar_url
        )
      `)
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false })

    if (promptsError) {
      console.error('Error fetching prompts:', promptsError)
      return NextResponse.json({ error: promptsError.message }, { status: 500 })
    }

    return NextResponse.json(prompts)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prompt = await request.json()

    if (!prompt.title || !prompt.prompt || !prompt.type || !prompt.tenant_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has access to the tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', prompt.tenant_id)
      .single()

    if (userTenantError || !userTenant) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('email_prompts')
      .insert([{
        ...prompt,
        description: prompt.description || null,
        created_by: session.user.id
      }])
      .select(`
        *,
        tenant:tenants (
          name,
          avatar_url
        ),
        creator:profiles (
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating prompt:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    const { error } = await supabase
      .from('email_prompts')
      .delete()
      .eq('id', id)
      .eq('created_by', session.user.id)

    if (error) {
      console.error('Error deleting prompt:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, title, prompt, type, tenant_id, description } = await request.json()

    if (!id || !title || !prompt || !type || !tenant_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has access to the tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (userTenantError || !userTenant) {
      return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
    }

    // Verify user is the creator of the prompt
    const { data: existingPrompt, error: promptError } = await supabase
      .from('email_prompts')
      .select('created_by')
      .eq('id', id)
      .single()

    if (promptError || !existingPrompt) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
    }

    if (existingPrompt.created_by !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to edit this prompt' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('email_prompts')
      .update({
        title,
        prompt,
        type,
        tenant_id,
        description: description || null
      })
      .eq('id', id)
      .select(`
        *,
        tenant:tenants (
          name,
          avatar_url
        ),
        creator:profiles (
          name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating prompt:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
} 