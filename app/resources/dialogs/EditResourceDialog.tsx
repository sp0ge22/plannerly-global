import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from 'lucide-react'
import { Resource, Category } from '../types'

interface EditResourceDialogProps {
  isOpen: boolean
  onClose: () => void
  onEdit: (resource: Resource) => Promise<void>
  resource: Resource | null
  categories: Category[]
  onAddCategory: (name: string) => Promise<any>
}

export function EditResourceDialog({
  isOpen,
  onClose,
  onEdit,
  resource,
  categories,
  onAddCategory
}: EditResourceDialogProps) {
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    if (resource) {
      setEditingResource(resource)
    }
  }, [resource])

  const handleClose = () => {
    setEditingResource(null)
    setIsAddingCategory(false)
    setNewCategory('')
    onClose()
  }

  const handleSubmit = async () => {
    if (!editingResource) return
    await onEdit(editingResource)
    handleClose()
  }

  if (!editingResource) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Resource</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={editingResource.title}
              onChange={(e) => setEditingResource(prev => 
                prev ? { ...prev, title: e.target.value } : null
              )}
              placeholder="Enter resource title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              value={editingResource.url}
              onChange={(e) => setEditingResource(prev => 
                prev ? { ...prev, url: e.target.value } : null
              )}
              placeholder="Enter resource URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description (optional)</Label>
            <Input
              id="edit-description"
              value={editingResource.description ?? ''}
              onChange={(e) => setEditingResource(prev => 
                prev ? { ...prev, description: e.target.value || null } : null
              )}
              placeholder="Enter resource description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-image-url">Image URL (optional)</Label>
            <Input
              id="edit-image-url"
              value={editingResource.image_url ?? ''}
              onChange={(e) => setEditingResource(prev => 
                prev ? { ...prev, image_url: e.target.value || null } : null
              )}
              placeholder="Enter image URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            {!isAddingCategory ? (
              <div className="flex items-center space-x-2">
                <Select
                  value={editingResource.category_id?.toString() ?? ''}
                  onValueChange={(value) => setEditingResource(prev => 
                    prev ? { ...prev, category_id: value ? parseInt(value) : null } : null
                  )}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter(category => category.tenant_id === editingResource.tenant_id)
                      .map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
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
                        setEditingResource(prev => 
                          prev ? { ...prev, category_id: newCategoryData.id } : null
                        )
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
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 