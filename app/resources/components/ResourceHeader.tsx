import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Library, Folder, Search, Crown, Shield, User } from 'lucide-react'
import { Category, Tenant } from '../types'

interface ResourceHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedCategory: string
  onCategoryChange: (value: string) => void
  selectedTenant: string
  onTenantChange: (value: string) => void
  categories: Category[]
  tenants: Tenant[]
  resources: any[]
  onManageCategories: () => void
  onAddResource: () => void
}

export function ResourceHeader({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedTenant,
  onTenantChange,
  categories,
  tenants,
  resources,
  onManageCategories,
  onAddResource
}: ResourceHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Manage and access your important links and resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/resource-library'} size="sm" className="h-9">
            <Library className="w-4 h-4 mr-2" />
            Resource Library
          </Button>
          <Button 
            variant="outline" 
            onClick={onManageCategories}
            size="sm" 
            className="h-9"
          >
            <Folder className="w-4 h-4 mr-2" />
            Manage Categories
          </Button>
          <Button onClick={onAddResource} size="sm" className="h-9">
            Add Resource
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-neutral-50 w-full"
          />
        </div>
        <div className="flex items-center space-x-2 justify-end">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="bg-neutral-50 w-[200px] flex justify-between items-center">
              <div className="flex items-center">
                <Folder className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories
                .filter(category => {
                  // Get resources for this category
                  const categoryResources = resources.filter(resource => 
                    resource.category_id === category.id && 
                    (selectedTenant === 'all' || resource.tenant_id === selectedTenant)
                  )
                  // Only include categories that have resources
                  return categoryResources.length > 0
                })
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={selectedTenant} onValueChange={onTenantChange}>
            <SelectTrigger className="bg-neutral-50 w-[200px]">
              <SelectValue>
                {selectedTenant === 'all' ? (
                  <div className="flex items-center space-x-2">
                    <span>All Organizations</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage 
                        src={tenants.find(t => t.id === selectedTenant)?.avatar_url || undefined}
                        alt={tenants.find(t => t.id === selectedTenant)?.name}
                      />
                      <AvatarFallback>
                        {tenants.find(t => t.id === selectedTenant)?.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{tenants.find(t => t.id === selectedTenant)?.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {tenants
                .sort((a, b) => {
                  // Sort by role priority: owner > admin > member
                  if (a.is_owner && !b.is_owner) return -1;
                  if (!a.is_owner && b.is_owner) return 1;
                  if (a.is_admin && !b.is_admin) return -1;
                  if (!a.is_admin && b.is_admin) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarImage src={tenant.avatar_url || undefined} />
                          <AvatarFallback>
                            {tenant.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{tenant.name}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {tenant.is_owner && (
                          <>
                            <Crown className="w-3 h-3 text-yellow-500" />
                            Owner
                          </>
                        )}
                        {tenant.is_admin && !tenant.is_owner && (
                          <>
                            <Shield className="w-3 h-3 text-blue-500" />
                            Admin
                          </>
                        )}
                        {!tenant.is_owner && !tenant.is_admin && (
                          <>
                            <User className="w-3 h-3" />
                            Member
                          </>
                        )}
                      </span>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
} 