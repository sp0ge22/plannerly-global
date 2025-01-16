import { Tenant, UserTenant } from './types'

export const canManageCategories = (tenantId: string, userTenants: UserTenant[]) => {
  const userTenant = userTenants.find(ut => ut.tenant_id === tenantId)
  return userTenant?.is_owner || userTenant?.is_admin === true || userTenant?.is_admin === null
}

export const canDeleteCategory = (categoryId: number, resources: any[]) => {
  return !resources.some(resource => resource.category_id === categoryId)
}

export const getDefaultTenant = (tenants: Tenant[]) => {
  return tenants
    .filter(t => t.is_owner)
    .sort((a, b) => a.name.localeCompare(b.name))[0]?.id || 
    tenants
    .filter(t => t.is_admin)
    .sort((a, b) => a.name.localeCompare(b.name))[0]?.id ||
    tenants[0]?.id
}

export const sortTenantsByRole = (tenants: Tenant[]) => {
  return tenants.sort((a, b) => {
    if (a.is_owner && !b.is_owner) return -1
    if (!a.is_owner && b.is_owner) return 1
    if (a.is_admin && !b.is_admin) return -1
    if (!a.is_admin && b.is_admin) return 1
    return a.name.localeCompare(b.name)
  })
} 