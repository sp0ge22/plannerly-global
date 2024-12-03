import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { name } = await request.json()
    console.log('Attempting to create category with name:', name)

    // First, check if category already exists
    const { data: existingCategory, error: checkError } = await supabase
      .from('resource_categories')
      .select('*')
      .eq('name', name)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing category:', checkError)
      throw checkError
    }

    if (existingCategory) {
      console.log('Category already exists:', existingCategory)
      return NextResponse.json(existingCategory)
    }

    // Create new category
    const { data: newCategory, error: insertError } = await supabase
      .from('resource_categories')
      .insert([{ name }])
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('resource_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 