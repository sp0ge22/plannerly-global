import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

interface ResourceData {
  title: string
  url: string
  description?: string | null
  category_id?: number | null
  icon?: string | null
  image_url?: string | null
  tenant_id: string
  created_by?: string
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { template_id, tenant_id, resource } = body

    // Get the template to copy its category_id
    const { data: template, error: templateError } = await supabase
      .from('resource_templates')
      .select('category_id')
      .eq('id', template_id)
      .single()

    if (templateError) {
      console.error('Error fetching template:', templateError)
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create a new category in the tenant's resource_categories if it doesn't exist
    const { data: templateCategory, error: templateCategoryError } = await supabase
      .from('resource_template_categories')
      .select('name, description, image_url')
      .eq('id', template.category_id)
      .single()

    if (templateCategoryError) {
      console.error('Error fetching template category:', templateCategoryError)
      return NextResponse.json(
        { error: 'Template category not found' },
        { status: 404 }
      )
    }

    // Check if a similar category exists for the tenant
    const { data: existingCategories, error: existingCategoryError } = await supabase
      .from('resource_categories')
      .select('id, name')
      .eq('tenant_id', tenant_id)
      .eq('name', templateCategory.name)

    if (existingCategoryError) {
      console.error('Error checking existing categories:', existingCategoryError)
      return NextResponse.json(
        { error: 'Failed to check existing categories' },
        { status: 500 }
      )
    }

    let categoryId: number | null = null

    if (existingCategories && existingCategories.length > 0) {
      // Use existing category
      categoryId = existingCategories[0].id
    } else {
      // Create new category
      const { data: newCategory, error: newCategoryError } = await supabase
        .from('resource_categories')
        .insert({
          name: templateCategory.name,
          description: templateCategory.description,
          image_url: templateCategory.image_url,
          tenant_id
        })
        .select()
        .single()

      if (newCategoryError) {
        console.error('Error creating new category:', newCategoryError)
        return NextResponse.json(
          { error: 'Failed to create category' },
          { status: 500 }
        )
      }

      categoryId = newCategory.id
    }

    // First, create the resource
    const resourceData: ResourceData = {
      title: resource.title,
      url: resource.url,
      description: resource.description || null,
      image_url: resource.image_url || null,
      icon: resource.icon || null,
      category_id: categoryId,
      tenant_id
    }

    // Add created_by if the column exists
    try {
      const { data: hasCreatedBy } = await supabase
        .from('resources')
        .select('created_by')
        .limit(1)
      
      if (hasCreatedBy !== null) {
        resourceData.created_by = user.id
      }
    } catch (error) {
      // Column doesn't exist, proceed without it
      console.log('created_by column not found, skipping...')
    }

    const { data: newResource, error: resourceError } = await supabase
      .from('resources')
      .insert(resourceData)
      .select()
      .single()

    if (resourceError || !newResource) {
      throw new Error(resourceError?.message || 'Failed to create resource')
    }

    // Then, create the link between template and tenant
    const { error: linkError } = await supabase
      .from('tenant_resource_templates')
      .insert({
        tenant_id,
        template_id,
        resource_id: newResource.id
      })

    if (linkError) {
      // If linking fails, delete the resource we just created
      await supabase
        .from('resources')
        .delete()
        .eq('id', newResource.id)
      throw new Error(linkError.message)
    }

    return NextResponse.json(newResource)
  } catch (error) {
    console.error('Error in add resource API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 