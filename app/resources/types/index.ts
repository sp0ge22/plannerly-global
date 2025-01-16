export interface Resource {
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

export interface Category {
  id: number
  name: string
  description: string | null
  image_url: string | null
  tenant_id: string
}

export interface Tenant {
  id: string
  name: string
  avatar_url: string | null
  is_owner?: boolean
  is_admin?: boolean
}

export interface UserTenant {
  tenant_id: string
  is_owner: boolean
  is_admin: boolean | null
  id?: string
}

export interface AIResourceSuggestion {
  title: string
  description: string
  url: string
  image_url: string | null
  suggestedCategory?: string
  category_id?: number | null
} 