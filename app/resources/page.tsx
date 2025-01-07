'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Folder, Link2, Search, Trash2, Pencil, Library, Sparkles, RefreshCw, Wand2, MessageSquare, Edit2, Crown, Shield, User } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LoadAndErrorButton } from '@/components/ui/loadbutton'


interface Resource {
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
  is_owner?: boolean
  is_admin?: boolean
}

interface UserTenant {
  tenant_id: string
  is_owner: boolean
  is_admin: boolean | null
  id?: string
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [userTenants, setUserTenants] = useState<UserTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTenant, setSelectedTenant] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [pin, setPin] = useState('')
  const { toast } = useToast()
  const [showAddResourceSuggestionDialog, setShowAddResourceSuggestionDialog] = useState(false)

  // Form states
  const [newResource, setNewResource] = useState<Partial<Resource>>({
    title: '',
    url: '',
    description: '',
    category_id: null,
    image_url: null,
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
      if (!newResource.tenant_id) {
        throw new Error('Please select an organization first')
      }

      // Check if category already exists for this tenant
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === newCategory.toLowerCase() && 
        cat.tenant_id === newResource.tenant_id
      )

      if (existingCategory) {
        // If category exists, select it and close the dialog
        setNewResource(prev => ({
          ...prev,
          category_id: existingCategory.id
        }))
        setIsAddingCategory(false)
        setNewCategory('')
        toast({
          title: "Category exists",
          description: "This category already exists and has been selected.",
        })
        return existingCategory
      }

      console.log('Creating new category:', newCategory, 'for tenant:', newResource.tenant_id)

      const response = await fetch('/api/resources/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategory,
          tenant_id: newResource.tenant_id
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

      toast({
        title: "Category added",
        description: "New category has been created.",
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
      // Debug logs
      console.log('Editing resource for tenant:', editingResource.tenant_id)
      console.log('Available user tenants:', userTenants)
      
      // Find the user tenant that matches the resource's tenant and check permissions
      const userTenant = userTenants.find(ut => {
        const isAdmin = ut.is_admin === true || ut.is_admin === null // treat null as true for backward compatibility
        console.log('Checking tenant:', ut.tenant_id, 'isAdmin:', isAdmin, 'isOwner:', ut.is_owner)
        return ut.tenant_id === editingResource.tenant_id && (ut.is_owner || isAdmin)
      })
      
      console.log('Found user tenant:', userTenant)
      
      if (!userTenant) {
        throw new Error('You must be an admin or owner to edit resources')
      }

      const resourceToUpdate = {
        ...editingResource,
        tenant_id: editingResource.tenant_id
      }

      const response = await fetch(`/api/resources/${editingResource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceToUpdate),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update resource')
      }

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
        description: error instanceof Error ? error.message : "There was an error updating the resource. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources')
      
      if (response.status === 401) {
        // Session expired, redirect to landing page
        window.location.href = '/'
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch resources')
      }

      const data = await response.json()
      console.log('Full API response:', data)
      console.log('Fetched tenants:', data.tenants)
      console.log('Fetched user tenants:', data.userTenants)
      
      if (!data.userTenants) {
        console.error('No userTenants data received from API')
        toast({
          title: "Warning",
          description: "Could not load user permissions. Some features may be limited.",
          variant: "destructive",
        })
      }
      
      // Sort tenants by role priority
      const sortedTenants = data.tenants.map((tenant: Tenant) => ({
        ...tenant,
        is_owner: data.userTenants?.some((ut: UserTenant) => ut.tenant_id === tenant.id && ut.is_owner),
        is_admin: data.userTenants?.some((ut: UserTenant) => ut.tenant_id === tenant.id && ut.is_admin)
      })).sort((a: Tenant, b: Tenant) => {
        if (a.is_owner && !b.is_owner) return -1
        if (!a.is_owner && b.is_owner) return 1
        if (a.is_admin && !b.is_admin) return -1
        if (!a.is_admin && b.is_admin) return 1
        return a.name.localeCompare(b.name)
      })
      
      setResources(data.resources)
      setCategories(data.categories)
      setTenants(sortedTenants)
      setUserTenants(data.userTenants || [])

      // Set default tenant for new resources
      if (sortedTenants.length > 0) {
        setNewResource(prev => ({ ...prev, tenant_id: sortedTenants[0].id }))
      }

      // Debug log after setting state
      console.log('UserTenants state after update:', data.userTenants || [])
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
      // Only include the fields that exist in the database schema
      const resourceToAdd = {
        title: newResource.title,
        url: newResource.url,
        description: newResource.description || null,
        category_id: newResource.category_id,
        image_url: newResource.image_url,
        tenant_id: newResource.tenant_id
      }

      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceToAdd),
      })

      if (!response.ok) throw new Error('Failed to add resource')

      const addedResource = await response.json()
      setResources(prev => [...prev, addedResource])
      setIsAddDialogOpen(false)
      setNewResource({ title: '', url: '', description: '', category_id: null, image_url: null, tenant_id: '' })
      
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
    const matchesCategory = selectedCategory === 'all' || (resource.category_id !== null && resource.category_id.toString() === selectedCategory)
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
        body: JSON.stringify({
          ...editingCategory,
          tenant_id: editingCategory.tenant_id
        }),
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

  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false)
  const [aiResourceSuggestion, setAiResourceSuggestion] = useState<{
    title: string
    description: string
    url: string
    image_url: string | null
    suggestedCategory?: string
    category_id?: number | null
  } | null>(null)
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [resourceUrl, setResourceUrl] = useState('')
  const [buttonVariant, setButtonVariant] = useState<"neutral" | "loading" | "error" | "success">("neutral")

  const handleAddWithAI = async () => {
    if (!resourceUrl) return

    setButtonVariant("loading")
    try {
      const response = await fetch('/api/resources/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: resourceUrl }),
      })

      if (!response.ok) throw new Error('Failed to get AI suggestion')

      const suggestion = await response.json()
      setAiResourceSuggestion(suggestion)
      setButtonVariant("success")
      setTimeout(() => {
        setButtonVariant("neutral")
      }, 1000)
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
      toast({
        title: "Failed to get AI suggestion",
        description: "There was an error analyzing the resource. Please try again.",
        variant: "destructive",
      })
      setButtonVariant("error")
      setTimeout(() => {
        setButtonVariant("neutral")
      }, 1000)
    }
  }

  const handleAddAISuggestion = () => {
    if (!aiResourceSuggestion) return

    // Create new resource with AI suggestion data
    const newResourceData = {
      title: aiResourceSuggestion.title,
      description: aiResourceSuggestion.description,
      url: aiResourceSuggestion.url,
      image_url: aiResourceSuggestion.image_url,
      tenant_id: selectedTenant !== 'all' ? selectedTenant : tenants[0]?.id || '',
      category_id: aiResourceSuggestion.category_id || null
    }

    setNewResource(newResourceData)
    setIsAIDialogOpen(false)
    setIsAddDialogOpen(true)
  }

  // Add new state for category management
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false)
  const [managingTenantId, setManagingTenantId] = useState<string>('')
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  // Add function to check if user can manage categories for a tenant
  const canManageCategories = (tenantId: string) => {
    const userTenant = userTenants.find(ut => ut.tenant_id === tenantId)
    return userTenant?.is_owner || userTenant?.is_admin === true || userTenant?.is_admin === null
  }

  // Add function to check if category can be deleted
  const canDeleteCategory = (categoryId: number) => {
    return !resources.some(resource => resource.category_id === categoryId)
  }

  // Add function to handle category deletion
  const handleDeleteCategory = async (category: Category) => {
    try {
      const response = await fetch(`/api/resources/categories/${category.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: category.tenant_id }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete category')
      }

      // Update local state
      setCategories(prev => prev.filter(c => c.id !== category.id))
      setCategoryToDelete(null)
      
      toast({
        title: "Category deleted",
        description: "The category has been removed successfully.",
      })
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Failed to delete category",
        description: error instanceof Error ? error.message : "There was an error deleting the category.",
        variant: "destructive",
      })
    }
  }

  const handleAddResourceClick = () => {
    setShowAddResourceSuggestionDialog(true)
  }

  const handleResourceSuggestionResponse = (useAI: boolean) => {
    setShowAddResourceSuggestionDialog(false)
    if (useAI) {
      setIsAIDialogOpen(true)
    } else {
      setIsAddDialogOpen(true)
    }
  }

  const getDefaultTenant = () => {
    return tenants
      .filter(t => t.is_owner)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.id || 
      tenants
      .filter(t => t.is_admin)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.id ||
      tenants[0]?.id
  }

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
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => window.location.href = '/resource-library'} size="sm" className="h-9">
                  <Library className="w-4 h-4 mr-2" />
                  Resource Library
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setManagingTenantId(getDefaultTenant())
                    setIsManageCategoriesOpen(true)
                  }} 
                  size="sm" 
                  className="h-9"
                >
                  <Folder className="w-4 h-4 mr-2" />
                  Manage Categories
                </Button>
                <Button onClick={handleAddResourceClick} size="sm" className="h-9">
                  <Plus className="w-4 h-4 mr-2" />
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-neutral-50 w-full"
                />
              </div>
              <div className="flex items-center space-x-2 justify-end">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
            ) : filteredResources.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-64 space-y-4"
              >
                <div className="p-4 rounded-full bg-muted">
                  <Library className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium">No resources found</p>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    {searchQuery || selectedCategory !== 'all' || selectedTenant !== 'all'
                      ? "Try adjusting your filters or search query to find what you're looking for."
                      : "Get started by adding your first resource using the 'Add Resource' button above."}
                  </p>
                </div>
              </motion.div>
            ) : selectedCategory === 'all' ? (
              // Show all categories
              categories
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(category => {
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
          </AnimatePresence>
        </div>
      </main>

      {/* Add Resource Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false)
          setNewResource({
            title: '',
            url: '',
            description: '',
            category_id: null,
            image_url: null,
            tenant_id: ''
          })
          setIsAddingCategory(false)
          setNewCategory('')
        } else {
          // Set default organization based on priority
          const defaultTenant = tenants
            .filter(tenant => userTenants.some(ut => ut.tenant_id === tenant.id))
            .sort((a, b) => {
              const aUserTenant = userTenants.find(ut => ut.tenant_id === a.id)
              const bUserTenant = userTenants.find(ut => ut.tenant_id === b.id)
              
              // Sort by role priority: owner > admin > member
              if (aUserTenant?.is_owner) return -1
              if (bUserTenant?.is_owner) return 1
              if (aUserTenant?.is_admin) return -1
              if (bUserTenant?.is_admin) return 1
              return 0
            })[0]

          if (defaultTenant) {
            setNewResource(prev => ({ ...prev, tenant_id: defaultTenant.id }))
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Resource</DialogTitle>
            <DialogDescription>
              Add a resource to your organization's library. Start by selecting the organization and category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Step 1: Organization */}
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
                          <div className="flex items-center justify-between flex-1 min-w-0">
                            <span className="truncate">{tenants.find(t => t.id === newResource.tenant_id)?.name}</span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                              {tenants.find(t => t.id === newResource.tenant_id)?.is_owner && (
                                <>
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                  Owner
                                </>
                              )}
                              {tenants.find(t => t.id === newResource.tenant_id)?.is_admin && !tenants.find(t => t.id === newResource.tenant_id)?.is_owner && (
                                <>
                                  <Shield className="w-3 h-3 text-blue-500" />
                                  Admin
                                </>
                              )}
                              {!tenants.find(t => t.id === newResource.tenant_id)?.is_owner && !tenants.find(t => t.id === newResource.tenant_id)?.is_admin && (
                                <>
                                  <User className="w-3 h-3" />
                                  Member
                                </>
                              )}
                            </span>
                          </div>
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
                          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-4 flex-shrink-0">
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

            {/* Step 2: Resource Details */}
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

            {/* Step 3: Category Selection */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newResource.category_id?.toString() ?? ''}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      if (!newResource.tenant_id) {
                        toast({
                          title: "Select an organization",
                          description: "Please select an organization before creating a new category.",
                          variant: "destructive",
                        })
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
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false)
              setNewResource({
                title: '',
                url: '',
                description: '',
                category_id: null,
                image_url: null,
                tenant_id: ''
              })
              setIsAddingCategory(false)
              setNewCategory('')
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
      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsDeleteDialogOpen(false);
          setSelectedResource(null);
          setPin('');
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={tenants.find(t => t.id === selectedResource?.tenant_id)?.avatar_url ?? undefined} />
                <AvatarFallback>
                  {tenants.find(t => t.id === selectedResource?.tenant_id)?.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">Confirm Deletion</DialogTitle>
                <DialogDescription className="mt-1">
                  Enter {tenants.find(t => t.id === selectedResource?.tenant_id)?.name}'s PIN to delete this resource
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-6">
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Resource to Delete:</h4>
                <div className="flex items-start gap-3">
                  {selectedResource?.image_url ? (
                    <img 
                      src={selectedResource.image_url} 
                      alt={selectedResource.title}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Link2 className="w-6 h-6 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-sm">{selectedResource?.title}</p>
                    {selectedResource?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {selectedResource.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="pin" className="text-sm font-medium">
                  Organization PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Contact your organization owner if you don't know the PIN
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedResource(null);
                setPin('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!pin.trim() || pin.length !== 4}
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
                value={editingResource?.description ?? ''}
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
                value={editingResource?.image_url ?? ''}
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
                    value={editingResource?.category_id?.toString() ?? ''}
                    onValueChange={(value) => setEditingResource(prev => 
                      prev ? { ...prev, category_id: value ? parseInt(value) : null } : null
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

      {/* AI Dialog */}
      <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Add Resource with AI</DialogTitle>
                <DialogDescription className="mt-1">
                Effortlessly create a resource with just a single input. Simply type the business name, and our tool automatically generates a complete resource, including the logo, title, URL, and description—all in one step.






</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            <div className="space-y-4">
              {/* Organization Selection */}
              <div className="space-y-2">
                <Label htmlFor="ai-organization">Organization</Label>
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
                    {tenants
                      .filter(tenant => canManageCategories(tenant.id))
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

              {/* Company Input */}
              <div className="space-y-2">
                <Label htmlFor="company-name">Company or Website</Label>
                <div className="space-y-2">
                  {!aiResourceSuggestion && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                      <p>Quick Tips:</p>
                      <ul className="mt-1 space-y-1 ml-4 list-disc">
                        <li>Simply type the name (e.g., "Slack" or "Netflix")</li>
                        <li>Don't include www, http, or any URL information</li>
                        <li>Works best with well-known companies and websites</li>
                        <li>If AI can't find your resource, you can easily add it manually below</li>
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      id="company-name"
                      placeholder="Enter company or website name"
                      value={resourceUrl}
                      onChange={(e) => setResourceUrl(e.target.value)}
                      className="h-11"
                    />
                    <LoadAndErrorButton
                      onClick={handleAddWithAI}
                      disabled={!resourceUrl || !newResource.tenant_id}
                      variant={buttonVariant}
                      text="Analyze"
                      icon={<Sparkles className="w-4 h-4" />}
                    />
                  </div>
                </div>
              </div>

              {/* AI Suggestion Result */}
              {aiResourceSuggestion && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-4">
                    {aiResourceSuggestion.image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                        <img
                          src={aiResourceSuggestion.image_url}
                          alt="Resource logo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg flex-shrink-0 bg-neutral-100 flex items-center justify-center">
                        <Link2 className="w-6 h-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="flex-grow space-y-2">
                      <h3 className="font-medium">{aiResourceSuggestion.title}</h3>
                      <p className="text-sm text-muted-foreground">{aiResourceSuggestion.description}</p>
                      <div className="text-xs text-muted-foreground">
                        {aiResourceSuggestion.url}
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/50 rounded-lg p-3 text-sm text-muted-foreground">
                    <p>
                      If you'd like to use a different image, you can add your own image URL in the next step. 
                      The image URL should end in .jpg, .png, or .gif.
                    </p>
                    <p className="mt-2">
                      <strong>Tip:</strong> To find an image URL from Google Images:
                    </p>
                    <ol className="list-decimal ml-4 mt-1 space-y-1">
                      <li>Search for the company/tool on Google Images</li>
                      <li>Right-click on the desired image</li>
                      <li>Select "Open image in new tab" or "Copy image address"</li>
                      <li>Use the URL that ends in .jpg, .png, or .gif</li>
                    </ol>
                  </div>
                </div>
              )}

              {!newResource.tenant_id && (
                <p className="text-sm text-muted-foreground">
                  Please select an organization before analyzing.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 flex-col gap-4">
            <Button
              onClick={handleAddAISuggestion}
              disabled={!aiResourceSuggestion}
              className="w-full gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setIsAIDialogOpen(false)
                setIsAddDialogOpen(true)
              }}
              className="w-full text-muted-foreground hover:text-primary"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Prefer to add manually? Click here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddingCategory} onOpenChange={(open) => {
        if (!open) {
          setIsAddingCategory(false)
          setNewCategory('')
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage 
                  src={tenants.find(t => t.id === newResource.tenant_id)?.avatar_url || undefined}
                />
                <AvatarFallback>
                  {tenants.find(t => t.id === newResource.tenant_id)?.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">Add New Category</DialogTitle>
                <DialogDescription className="mt-1">
                  Create a new category for {tenants.find(t => t.id === newResource.tenant_id)?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-category">Category Name</Label>
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name"
                  className="h-11"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">Existing Categories</h4>
                <div className="space-y-1.5">
                  {categories
                    .filter(category => category.tenant_id === newResource.tenant_id)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(category => (
                      <div key={category.id} className="text-sm text-muted-foreground flex items-center gap-2">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} className="w-4 h-4 rounded" />
                        ) : (
                          <Folder className="w-4 h-4" />
                        )}
                        {category.name}
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingCategory(false)
                setNewCategory('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const newCategoryData = await handleAddCategory()
                  if (newCategoryData) {
                    setNewResource(prev => ({
                      ...prev,
                      category_id: newCategoryData.id
                    }))
                  }
                  setIsAddingCategory(false)
                  setNewCategory('')
                } catch (error) {
                  console.error('Error adding category:', error)
                }
              }}
              disabled={!newCategory}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={isManageCategoriesOpen} onOpenChange={(open) => {
        if (open) {
          setManagingTenantId(getDefaultTenant())
        }
        setIsManageCategoriesOpen(open)
      }}>
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
                value={managingTenantId || tenants.find(t => t.is_owner)?.id || ''}
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
                    .filter(tenant => canManageCategories(tenant.id))
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

            {/* Rest of the manage categories dialog content... */}
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
                              onClick={() => {
                                setEditingCategory(category)
                                setIsEditCategoryDialogOpen(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setCategoryToDelete(category)}
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

      {/* Delete Category Confirmation Dialog */}
      <Dialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Category to Delete:</h4>
            <p className="text-sm text-muted-foreground">{categoryToDelete?.name}</p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => categoryToDelete && handleDeleteCategory(categoryToDelete)}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Resource Suggestion Dialog */}
      <Dialog open={showAddResourceSuggestionDialog} onOpenChange={setShowAddResourceSuggestionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Try AI-Assisted Creation?</DialogTitle>
                <DialogDescription className="text-base">
                  Let AI help you add resources more efficiently
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <Wand2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Smart Resource Detection</h4>
                  <p className="text-sm text-muted-foreground">
                    AI automatically extracts key information like title and description from company or tool names
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Logo Discovery</h4>
                  <p className="text-sm text-muted-foreground">
                    AI will find and suggest the best logo for your resource
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Simple Input</h4>
                  <p className="text-sm text-muted-foreground">
                    Just enter a company or tool name, and AI will do the rest
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleResourceSuggestionResponse(false)}>
              <Edit2 className="w-4 h-4 mr-2" />
              I'll add it manually
            </Button>
            <Button onClick={() => handleResourceSuggestionResponse(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Use AI Assistant
            </Button>
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
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {resource.description}
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
