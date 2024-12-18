import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { tenant_id, pin } = await request.json()

    if (!tenant_id || !pin) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Query the tenants table to verify the PIN
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('pin')
      .eq('id', tenant_id)
      .single()

    if (error) {
      console.error('Error verifying PIN:', error)
      return new NextResponse('Error verifying PIN', { status: 500 })
    }

    if (!tenant) {
      return new NextResponse('Organization not found', { status: 404 })
    }

    // Compare the provided PIN with the stored PIN
    if (tenant.pin !== pin) {
      return new NextResponse('Invalid PIN', { status: 401 })
    }

    return new NextResponse('PIN verified', { status: 200 })
  } catch (error) {
    console.error('Error in verify-org-pin:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 