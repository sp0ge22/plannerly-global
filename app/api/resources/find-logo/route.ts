import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()

    if (authError || !session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract domain from URL
    let domain
    try {
      domain = new URL(url).hostname.replace('www.', '')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Use Clearbit's Logo API
    const logoUrl = `https://logo.clearbit.com/${domain}`

    // Verify the logo exists
    try {
      const response = await fetch(logoUrl)
      if (!response.ok) {
        throw new Error('Logo not found')
      }
    } catch (error) {
      // If logo not found, try alternative domain formats
      const altDomains = [
        `www.${domain}`,
        domain.split('.').slice(-2).join('.'), // Try main domain without subdomain
      ]

      for (const altDomain of altDomains) {
        const altLogoUrl = `https://logo.clearbit.com/${altDomain}`
        try {
          const response = await fetch(altLogoUrl)
          if (response.ok) {
            return NextResponse.json({ image_url: altLogoUrl })
          }
        } catch {
          continue
        }
      }

      return NextResponse.json({ error: 'Logo not found' }, { status: 404 })
    }

    return NextResponse.json({ image_url: logoUrl })
  } catch (error) {
    console.error('Error in find-logo endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to find logo' },
      { status: 500 }
    )
  }
} 