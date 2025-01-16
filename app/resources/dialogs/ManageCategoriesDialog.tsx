import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Folder, Pencil, Trash2, Crown, Shield, User } from 'lucide-react'
import { Category, Tenant, UserTenant } from '../types'
import { canManageCategories } from '../utils'

interface ManageCategoriesDialogProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  tenants: Tenant[]
  userTenants: UserTenant[]
  onEditCategory: (category: Category) => void
  onDeleteCategory: (category: Category) => void
  defaultTenantId?: string
  resources: any[]
}

export function ManageCategoriesDialog({
  isOpen,
  onClose,
  categories,
  tenants,
  userTenants,
  onEditCategory,
  onDeleteCategory,
  defaultTenantId,
  resources
}: ManageCategoriesDialogProps) {
  const [managingTenantId, setManagingTenantId] = useState(defaultTenantId || '')

  const canDeleteCategory = (categoryId: number) => {
    return !resources.some(resource => resource.category_id === categoryId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            View and manage categories for your organizations.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select
              value={managingTenantId}
              onValueChange={setManagingTenantId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization">
                  {managingTenantId && (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={tenants.find(t => t.id === managingTenantId)?.avatar_url || undefined}
                          />
                          <AvatarFallback>
                            {tenants.find(t => t.id === managingTenantId)?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{tenants.find(t => t.id === managingTenantId)?.name}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs ml-2 text-muted-foreground">
                        {tenants.find(t => t.id === managingTenantId)?.is_owner && (
                          <>
                            <Crown className="w-3 h-3 text-yellow-500" />
                            Owner
                          </>
                        )}
                        {tenants.find(t => t.id === managingTenantId)?.is_admin && !tenants.find(t => t.id === managingTenantId)?.is_owner && (
                          <>
                            <Shield className="w-3 h-3 text-blue-500" />
                            Admin
                          </>
                        )}
                        {!tenants.find(t => t.id === managingTenantId)?.is_owner && !tenants.find(t => t.id === managingTenantId)?.is_admin && (
                          <>
                            <User className="w-3 h-3" />
                            Member
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenants
                  .filter(tenant => canManageCategories(tenant.id, userTenants))
                  .sort((a, b) => {
                    if (a.is_owner && !b.is_owner) return -1
                    if (!a.is_owner && b.is_owner) return 1
                    if (a.is_admin && !b.is_admin) return -1
                    if (!a.is_admin && b.is_admin) return 1
                    return a.name.localeCompare(b.name)
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

          {managingTenantId && (
            <div className="border rounded-lg">
              <div className="divide-y">
                {categories
                  .filter(category => category.tenant_id === managingTenantId)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(category => {
                    const resourceCount = resources.filter(r => r.category_id === category.id).length
                    return (
                      <div key={category.id} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          {category.image_url ? (
                            <img src={category.image_url} alt={category.name} className="w-8 h-8 rounded" />
                          ) : (
                            <Folder className="w-8 h-8 text-muted-foreground" />
                          )}
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditCategory(category)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteCategory(category)}
                            disabled={!canDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                {categories.filter(category => category.tenant_id === managingTenantId).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <div className="p-4 rounded-full bg-muted">
                      <Folder className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <h3 className="font-medium">No categories yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Categories will appear here once they are created when adding resources.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 