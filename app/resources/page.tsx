'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Folder, Link2, Search, Trash2, Pencil } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"


interface Resource {
  id: number
  title: string
  url: string
  description: string | null
  category_id: number
  icon: string | null
  image_url: string | null
  created_at: string
  tenant_id: string
}

interface Category {
  id: number
  name: string
  description: string | null
  image_url: string | null
  tenant_id: string
}

interface Tenant {
  id: string
  name: string
  avatar_url: string | null
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTenant, setSelectedTenant] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [pin, setPin] = useState('')
  const { toast } = useToast()

  // Form states
  const [newResource, setNewResource] = useState({
    title: '',
    url: '',
    description: '',
    category_id: '',
    image_url: '',
    tenant_id: ''
  })

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  
  // Add editResource state
  const [editingResource, setEditingResource] = useState<Resource | null>(null)

  // Function to handle category creation
  const handleAddCategory = async () => {
    try {
      console.log('Creating new category:', newCategory)

      const response = await fetch('/api/resources/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategory,
          tenant_id: selectedTenant !== 'all' ? selectedTenant : undefined
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add category')
      }

      console.log('Response from category creation:', data)

      if (!data.id) {
        throw new Error('No category ID returned')
      }

      // Update local categories state
      setCategories(prev => {
        // Check if category already exists
        const exists = prev.some(cat => cat.id === data.id)
        if (exists) return prev
        return [...prev, data]
      })

      // If we're in edit mode, update the resource with the new category
      if (editingResource) {
        const updatedResource = {
          ...editingResource,
          category_id: data.id
        }
        
        console.log('Updating resource with new category:', updatedResource)

        const updateResponse = await fetch(`/api/resources/${editingResource.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedResource),
        })

        if (!updateResponse.ok) {
          const updateError = await updateResponse.json()
          throw new Error(updateError.error || 'Failed to update resource category')
        }

        const updatedResourceData = await updateResponse.json()
        console.log('Updated resource data:', updatedResourceData)
        
        setResources(prev => prev.map(r => 
          r.id === updatedResourceData.id ? updatedResourceData : r
        ))
        
        setEditingResource(updatedResourceData)
      } else {
        setNewResource(prev => ({ ...prev, category_id: data.id.toString() }))
      }

      setNewCategory('')
      setIsAddingCategory(false)
      
      toast({
        title: "Category added",
        description: "New category has been created and assigned.",
      })

      return data
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Failed to add category",
        description: error instanceof Error ? error.message : "There was an error adding the category. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  // Function to handle resource updates
  const handleEditResource = async () => {
    if (!editingResource) return

    try {
      const response = await fetch(`/api/resources/${editingResource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingResource),
      })

      if (!response.ok) throw new Error('Failed to update resource')

      const updatedResource = await response.json()
      setResources(prev => prev.map(r => 
        r.id === updatedResource.id ? updatedResource : r
      ))
      setIsEditDialogOpen(false)
      setEditingResource(null)

      toast({
        title: "Resource updated",
        description: "Your changes have been saved.",
      })
    } catch (error) {
      console.error('Error updating resource:', error)
      toast({
        title: "Failed to update resource",
        description: "There was an error updating the resource. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources')
      const data = await response.json()
      console.log('Fetched tenants:', data.tenants)
      setResources(data.resources)
      setCategories(data.categories)
      setTenants(data.tenants)
    } catch (error) {
      console.error('Error fetching resources:', error)
      toast({
        title: "Failed to fetch resources",
        description: "There was an error loading your resources. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [])

  const handleAddResource = async () => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newResource),
      })

      if (!response.ok) throw new Error('Failed to add resource')

      const addedResource = await response.json()
      setResources(prev => [...prev, addedResource])
      setIsAddDialogOpen(false)
      setNewResource({ title: '', url: '', description: '', category_id: '', image_url: '', tenant_id: '' })
      
      toast({
        title: "Resource added",
        description: "Your new resource has been added successfully.",
      })
    } catch (error) {
      console.error('Error adding resource:', error)
      toast({
        title: "Failed to add resource",
        description: "There was an error adding your resource. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!selectedResource) return

    try {
      const response = await fetch(`/api/resources/${selectedResource.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!response.ok) throw new Error('Failed to delete resource')

      setResources(prev => prev.filter(r => r.id !== selectedResource.id))
      setIsDeleteDialogOpen(false)
      setPin('')
      setSelectedResource(null)

      toast({
        title: "Resource deleted",
        description: "The resource has been removed.",
      })
    } catch (error) {
      console.error('Error deleting resource:', error)
      toast({
        title: "Failed to delete resource",
        description: "There was an error deleting the resource. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredResources = resources.filter(resource => {
    const matchesSearch = 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || resource.category_id === parseInt(selectedCategory)
    const matchesTenant = selectedTenant === 'all' || resource.tenant_id === selectedTenant
    return matchesSearch && matchesCategory && matchesTenant
  })

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false);

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    try {
      const response = await fetch(`/api/resources/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory),
      });

      if (!response.ok) throw new Error('Failed to update category');

      const updatedCategory = await response.json();
      
      // Update categories state
      setCategories(prev => prev.map(c => 
        c.id === updatedCategory.id ? updatedCategory : c
      ));
      
      setIsEditCategoryDialogOpen(false);
      setEditingCategory(null);

      toast({
        title: "Category updated",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Failed to update category",
        description: "There was an error updating the category. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and access your important links and resources
                </p>
              </div>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="h-9">
                <Plus className="w-4 h-4 mr-2" />
                Add Resource
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-neutral-50 w-full"
                />
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="bg-neutral-50 w-[200px]">
                    <Folder className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTenant} onValueChange={setSelectedTenant}>
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
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={tenant.avatar_url || undefined} />
                            <AvatarFallback>
                              {tenant.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{tenant.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Resources Grid */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 space-y-4"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-lg font-medium">Loading resources...</p>
              </motion.div>
            ) : (
              <>
                {selectedCategory === 'all' ? (
                  // Show all categories
                  categories.map(category => {
                    const categoryResources = filteredResources.filter(
                      resource => resource.category_id === category.id
                    )
                    if (categoryResources.length === 0) return null

                    // Find the tenant for this category
                    const tenant = tenants.find(t => t.id === category.tenant_id)

                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div 
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsEditCategoryDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {category.image_url ? (
                              <img 
                                src={category.image_url} 
                                alt={category.name}
                                className="w-6 h-6 object-cover rounded"
                              />
                            ) : (
                              <Folder className="w-6 h-6 text-muted-foreground" />
                            )}
                            <div className="flex items-center gap-2">
                              <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                                {category.name}
                              </h2>
                              <span className="text-muted-foreground text-sm">•</span>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage 
                                    src={tenant?.avatar_url || undefined}
                                    alt={tenant?.name}
                                  />
                                  <AvatarFallback>
                                    {tenant?.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">{tenant?.name}</span>
                              </div>
                            </div>
                            <Pencil className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryResources.map((resource) => (
                            <ResourceCard
                              key={resource.id}
                              resource={resource}
                              onEdit={() => {
                                setEditingResource(resource)
                                setIsEditDialogOpen(true)
                              }}
                              onDelete={() => {
                                setSelectedResource(resource)
                                setIsDeleteDialogOpen(true)
                              }}
                              tenants={tenants}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  // Show selected category
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold">
                          {categories.find(c => c.id.toString() === selectedCategory)?.name}
                        </h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredResources.map((resource) => (
                        <ResourceCard
                          key={resource.id}
                          resource={resource}
                          onEdit={() => {
                            setEditingResource(resource)
                            setIsEditDialogOpen(true)
                          }}
                          onDelete={() => {
                            setSelectedResource(resource)
                            setIsDeleteDialogOpen(true)
                          }}
                          tenants={tenants}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Add Resource Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={tenant.avatar_url || undefined} />
                          <AvatarFallback>
                            {tenant.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{tenant.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                value={newResource.description}
                onChange={(e) => setNewResource(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter resource description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input
                id="image_url"
                value={newResource.image_url || ''}
                onChange={(e) => setNewResource(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="Enter image URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              {!isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <Select
                    value={newResource.category_id}
                    onValueChange={(value) => setNewResource(prev => ({ ...prev, category_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter(category => category.tenant_id === newResource.tenant_id)
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
                    onClick={handleAddCategory}
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
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setNewResource({
                title: '',
                url: '',
                description: '',
                category_id: '',
                image_url: '',
                tenant_id: ''
              })
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddResource}
              disabled={!newResource.title || !newResource.url || !newResource.tenant_id}
            >
              Add Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Resource
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="mb-6 space-y-2">
              <p className="font-medium">Are you sure you want to delete this resource?</p>
              <p className="text-sm text-muted-foreground">
                &ldquo;{selectedResource?.title}&rdquo;
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">Enter your PIN to confirm:</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="max-w-[200px]"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setPin('')
                setSelectedResource(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!pin}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Edit Resource Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editingResource?.title || ''}
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
                value={editingResource?.url || ''}
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
                value={editingResource?.description || ''}
                onChange={(e) => setEditingResource(prev => 
                  prev ? { ...prev, description: e.target.value } : null
                )}
                placeholder="Enter resource description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image-url">Image URL (optional)</Label>
              <Input
                id="edit-image-url"
                value={editingResource?.image_url || ''}
                onChange={(e) => setEditingResource(prev => 
                  prev ? { ...prev, image_url: e.target.value } : null
                )}
                placeholder="Enter image URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              {!isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <Select
                    value={editingResource?.category_id.toString()}
                    onValueChange={(value) => setEditingResource(prev => 
                      prev ? { ...prev, category_id: parseInt(value) } : null
                    )}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
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
                        const newCategoryData = await handleAddCategory()
                        if (editingResource && newCategoryData) {
                          setEditingResource({
                            ...editingResource,
                            category_id: newCategoryData.id
                          })
                        }
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditResource}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name</Label>
              <Input
                id="category-name"
                value={editingCategory?.name || ''}
                onChange={(e) => setEditingCategory(prev => 
                  prev ? { ...prev, name: e.target.value } : null
                )}
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-image">Image URL (optional)</Label>
              <Input
                id="category-image"
                value={editingCategory?.image_url || ''}
                onChange={(e) => setEditingCategory(prev => 
                  prev ? { ...prev, image_url: e.target.value } : null
                )}
                placeholder="Enter image URL"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCategory}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// New ResourceCard component for better organization
function ResourceCard({ 
  resource, 
  onEdit, 
  onDelete,
  tenants 
}: { 
  resource: Resource
  onEdit: () => void
  onDelete: () => void
  tenants: Tenant[]
}) {
  const tenant = tenants.find((t: Tenant) => t.id === resource.tenant_id)
  
  return (
    <Card 
      className="group hover:shadow-lg transition-all duration-200 overflow-hidden relative cursor-pointer"
      onClick={() => window.open(resource.url, '_blank')}
    >
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 z-10 flex space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation() // Prevent card click
            onEdit()
          }}
          className="h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80 backdrop-blur-sm"
        >
          <Pencil className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation() // Prevent card click
            onDelete()
          }}
          className="h-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background/80 backdrop-blur-sm"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      <CardHeader className="p-4">
        <div className="flex items-start gap-4">
          {resource.image_url ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
              <img
                src={resource.image_url}
                alt={resource.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-neutral-100 flex items-center justify-center">
              <Link2 className="w-6 h-6 text-neutral-400" />
            </div>
          )}
          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {resource.title}
                </h3>
                {resource.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {resource.description}
                  </p>
                )}
                {tenant && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {tenant.name}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
