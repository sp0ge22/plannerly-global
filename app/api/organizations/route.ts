import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, pin } = await request.json()
    
    // Validate PIN
    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      )
    }

    // Initialize supabase client with auth context
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Start a transaction to create tenant and link user
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ 
        name: name.trim(),
        pin: pin,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('id')
      .single()

    if (tenantError) {
      console.error('Error creating tenant:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Link user as owner
    const { error: userTenantError } = await supabase
      .from('user_tenants')
      .insert([{
        user_id: session.user.id,
        tenant_id: tenantData.id,
        is_owner: true,
        created_at: new Date().toISOString()
      }])

    if (userTenantError) {
      console.error('Error linking user to tenant:', userTenantError)
      // Attempt to cleanup the tenant if user link fails
      await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantData.id)

      return NextResponse.json(
        { error: 'Failed to setup organization membership' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: tenantData.id,
      name: name.trim()
    })
  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 