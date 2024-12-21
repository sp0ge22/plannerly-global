import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

const openai = new OpenAI()

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's organizations and their roles
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        is_owner,
        is_admin,
        tenants:tenant_id (
          id,
          name,
          avatar_url
        )
      `)
      .eq('user_id', session.user.id)

    if (userTenantsError || !userTenants?.length) {
      return NextResponse.json({ error: 'No organizations found' }, { status: 400 })
    }

    // Find the highest priority organization (owner > admin > member)
    const defaultTenant = userTenants.sort((a, b) => {
      if (a.is_owner && !b.is_owner) return -1
      if (!a.is_owner && b.is_owner) return 1
      if (a.is_admin && !b.is_admin) return -1
      if (!a.is_admin && b.is_admin) return 1
      return 0
    })[0]

    const { companyName } = await request.json()

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Get categories for the default tenant
    const { data: categories } = await supabase
      .from('resource_categories')
      .select('id, name')
      .eq('tenant_id', defaultTenant.tenant_id)

    // First, use AI to get the official URL
    const urlCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that provides official website URLs for companies. Return only the URL, nothing else."
        },
        {
          role: "user",
          content: `What is the official website URL for ${companyName}?`
        }
      ]
    })

    const url = urlCompletion.choices[0].message.content
    if (!url) {
      return NextResponse.json({ error: 'Could not determine URL' }, { status: 400 })
    }

    const cleanUrl = url.trim()
    if (!cleanUrl) {
      return NextResponse.json({ error: 'Could not determine URL' }, { status: 400 })
    }

    // Extract domain for logo
    let domain
    try {
      domain = new URL(cleanUrl).hostname.replace('www.', '')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Get logo URL from Clearbit
    const logoUrl = `https://logo.clearbit.com/${domain}`
    let validLogoUrl = null

    try {
      const logoResponse = await fetch(logoUrl)
      if (logoResponse.ok) {
        validLogoUrl = logoUrl
      } else {
        // Try alternative domain formats
        const altDomains = [
          `www.${domain}`,
          domain.split('.').slice(-2).join('.'), // Try main domain without subdomain
        ]

        for (const altDomain of altDomains) {
          const altLogoUrl = `https://logo.clearbit.com/${altDomain}`
          try {
            const response = await fetch(altLogoUrl)
            if (response.ok) {
              validLogoUrl = altLogoUrl
              break
            }
          } catch {
            continue
          }
        }
      }
    } catch (error) {
      console.error('Error fetching logo:', error)
    }

    // Fetch the webpage content
    const response = await fetch(cleanUrl)
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract meta information
    const rawTitle = 
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      domain

    const rawDescription = 
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ''

    // Use AI to clean up and categorize
    const cleanupCompletion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that simplifies business resource information and categorizes them. You must try to use existing categories first before suggesting new ones."
        },
        {
          role: "user",
          content: `Please simplify this resource information and categorize it.
          Raw Title: ${rawTitle}
          Raw Description: ${rawDescription}
          Available Categories: ${categories?.map(c => c.name).join(', ') || 'No categories available'}

          Requirements:
          1. Title should be just the business name (e.g., "ULINE")
          2. Description should be a very brief explanation of what users can do on the site (e.g., "Order warehouse and shipping supplies")
          3. For the category:
             - You MUST try to use one of the available categories first
             - Only suggest a new category if the resource ABSOLUTELY cannot fit into any existing category
             - If suggesting a category, use EXACTLY one of the available categories listed above
             - Example: if "Marketing" exists in available categories, use "Marketing", not "Digital Marketing" or "Marketing Tools"

          Return in JSON format with:
          {
            "title": "business name",
            "description": "what users can do on the site",
            "suggestedCategory": "MUST use an existing category name if possible"
          }`
        }
      ],
      response_format: { type: "json_object" }
    })

    const messageContent = cleanupCompletion.choices[0].message.content
    if (!messageContent) {
      return NextResponse.json({ error: 'Failed to clean up resource information' }, { status: 500 })
    }

    const cleanedInfo = JSON.parse(messageContent)

    // Try to match the suggested category with an existing one
    const matchingCategory = categories?.find(
      cat => cat.name.toLowerCase() === cleanedInfo.suggestedCategory.toLowerCase()
    )

    // If we found a matching category, use its ID
    const categoryId = matchingCategory?.id || null

    return NextResponse.json({
      title: cleanedInfo.title,
      description: cleanedInfo.description,
      url: cleanUrl,
      image_url: validLogoUrl,
      suggestedCategory: cleanedInfo.suggestedCategory,
      categoryId,
      category_id: categoryId,
      tenant_id: defaultTenant.tenant_id
    })
  } catch (error) {
    console.error('Error in suggest endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to analyze resource' },
      { status: 500 }
    )
  }
} 