import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Crown, Shield, User } from 'lucide-react'
import { Resource, Tenant } from '../types'

interface AddResourceDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddResource: (resource: Partial<Resource>) => Promise<void>
  tenants: Tenant[]
  categories: any[]
  onAddCategory: (name: string) => Promise<any>
  defaultTenantId?: string
}

export function AddResourceDialog({
  isOpen,
  onClose,
  onAddResource,
  tenants,
  categories,
  onAddCategory,
  defaultTenantId
}: AddResourceDialogProps) {
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    title: '',
    url: '',
    description: '',
    category_id: null,
    image_url: null,
    tenant_id: defaultTenantId || ''
  })
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  const handleSubmit = async () => {
    await onAddResource(newResource)
    handleClose()
  }

  const handleClose = () => {
    setNewResource({
      title: '',
      url: '',
      description: '',
      category_id: null,
      image_url: null,
      tenant_id: defaultTenantId || ''
    })
    setIsAddingCategory(false)
    setNewCategory('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Resource</DialogTitle>
          <DialogDescription>
            Add a resource to your organization's library. Start by selecting the organization and category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Organization Selection */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select
                value={newResource.tenant_id}
                onValueChange={(value) => setNewResource(prev => ({ ...prev, tenant_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization">
                    {newResource.tenant_id && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={tenants.find(t => t.id === newResource.tenant_id)?.avatar_url || undefined}
                          />
                          <AvatarFallback>
                            {tenants.find(t => t.id === newResource.tenant_id)?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{tenants.find(t => t.id === newResource.tenant_id)?.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
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

          {/* Resource Details */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newResource.title}
                onChange={(e) => setNewResource(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter resource title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={newResource.url}
                onChange={(e) => setNewResource(prev => ({ ...prev, url: e.target.value }))}
                placeholder="Enter resource URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={newResource.description ?? ''}
                onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter resource description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input
                id="image_url"
                value={newResource.image_url ?? ''}
                onChange={(e) => setNewResource(prev => ({ ...prev, image_url: e.target.value || null }))}
                placeholder="Enter image URL"
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              {!isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <Select
                    value={newResource.category_id?.toString() ?? ''}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        if (!newResource.tenant_id) {
                          return
                        }
                        setIsAddingCategory(true)
                        return
                      }
                      setNewResource(prev => ({ 
                        ...prev, 
                        category_id: value ? parseInt(value) : null 
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={newResource.tenant_id ? "Select a category" : "Select an organization first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {newResource.tenant_id ? (
                        <>
                          {categories
                            .filter(category => category.tenant_id === newResource.tenant_id)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(category => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          <SelectItem value="new" className="text-primary font-medium">
                            + Add New Category
                          </SelectItem>
                        </>
                      ) : (
                        <SelectItem value="disabled" disabled>
                          Select an organization first
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingCategory(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Input
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="New category name"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const newCategoryData = await onAddCategory(newCategory)
                        if (newCategoryData) {
                          setNewResource(prev => ({
                            ...prev,
                            category_id: newCategoryData.id
                          }))
                        }
                        setIsAddingCategory(false)
                        setNewCategory('')
                      } catch (error) {
                        console.error('Error handling category addition:', error)
                      }
                    }}
                    disabled={!newCategory}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingCategory(false)
                      setNewCategory('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!newResource.title || !newResource.url || !newResource.tenant_id}
          >
            Add Resource
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 