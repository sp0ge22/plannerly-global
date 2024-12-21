'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Library, Plus, Search, Link2, ExternalLink, Folder } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ResourceTemplate = {
  id: number
  title: string
  description: string | null
  url: string
  category_id: number
  image_url: string | null
  created_at: string
  is_public: boolean
  metadata: Record<string, unknown>
}

type ResourceTemplateCategory = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  created_at: string
  sort_order: number
}

type Tenant = {
  id: string
  name: string
  avatar_url: string | null
}

type Category = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  tenant_id: string
}

interface CustomizedResource {
  title: string
  url: string
  description: string
  image_url: string
  category_id?: number | null
}

interface UserTenant {
  tenant_id: string
  is_owner: boolean
  is_admin: boolean
  user_id: string
  created_at: string
}

// Add helper function to get default organization
function getDefaultOrganization(tenants: Tenant[], userTenants: UserTenant[]): string | null {
  // First try to find an org where user is owner
  const ownerOrg = userTenants.find(ut => ut.is_owner)?.tenant_id;
  if (ownerOrg) return ownerOrg;

  // Then try to find an org where user is admin
  const adminOrg = userTenants.find(ut => ut.is_admin)?.tenant_id;
  if (adminOrg) return adminOrg;

  // Finally, return the first org where user is a member
  return userTenants[0]?.tenant_id || null;
}

export default function ResourceLibraryPage() {
  const [templates, setTemplates] = useState<ResourceTemplate[]>([])
  const [categories, setCategories] = useState<ResourceTemplateCategory[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddingToOrg, setIsAddingToOrg] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ResourceTemplate | null>(null)
  const [customizedResource, setCustomizedResource] = useState<CustomizedResource>({
    title: '',
    url: '',
    description: '',
    image_url: '',
    category_id: null
  })
  const [orgCategories, setOrgCategories] = useState<Category[]>([])
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<ResourceTemplateCategory | null>(null)
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);

  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/resource-library');
        const data = await response.json();
        
        setCategories(data.categories);
        setTemplates(data.templates);
        setTenants(data.tenants);
        setUserTenants(data.userTenants); // Store user's tenant relationships

        // Set default organization
        const defaultOrg = getDefaultOrganization(data.tenants, data.userTenants);
        if (defaultOrg) {
          setSelectedTenant(defaultOrg);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load resource library data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchOrgCategories = async () => {
      if (!selectedTenant) return

      try {
        const response = await fetch('/api/resources/categories')
        const data = await response.json()
        
        if (!response.ok) throw new Error(data.error)
        
        setOrgCategories(data)
      } catch (error) {
        console.error('Error fetching categories:', error)
        toast({
          title: "Error loading categories",
          description: "Could not load organization categories. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchOrgCategories()
  }, [selectedTenant])

  const handleAddCategory = async () => {
    if (!selectedTenant || !newCategory.trim()) return

    try {
      const response = await fetch('/api/resources/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newCategory,
          tenant_id: selectedTenant
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add category')
      }

      setOrgCategories(prev => [...prev, data])
      setCustomizedResource(prev => ({ ...prev, category_id: data.id }))
      setNewCategory('')
      setIsAddingCategory(false)

      toast({
        title: "Category added",
        description: "New category has been created.",
      })
    } catch (error) {
      console.error('Error adding category:', error)
      toast({
        title: "Failed to add category",
        description: "There was an error adding the category. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddToOrg = async () => {
    if (!selectedTemplate || !selectedTenant) return

    try {
      const response = await fetch('/api/resource-library/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: selectedTemplate.id,
          tenant_id: selectedTenant,
          resource: customizedResource
        }),
      })

      if (!response.ok) throw new Error('Failed to add resource')

      setIsAddingToOrg(false)
      setSelectedTemplate(null)
      setCustomizedResource({
        title: '',
        url: '',
        description: '',
        image_url: '',
        category_id: null
      })
      setSelectedTemplateCategory(null)

      toast({
        title: "Resource added",
        description: "The resource has been added to your organization.",
      })
    } catch (error) {
      console.error('Error adding resource:', error)
      toast({
        title: "Error adding resource",
        description: "Could not add the resource. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleOpenAddDialog = (template: ResourceTemplate) => {
    const templateCategory = categories.find(c => c.id === template.category_id)
    setSelectedTemplate(template)
    setSelectedTemplateCategory(templateCategory || null)
    setCustomizedResource({
      title: template.title,
      url: template.url,
      description: template.description || '',
      image_url: template.image_url || '',
      category_id: null
    })
    setIsAddingToOrg(true)
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category_id === parseInt(selectedCategory)
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Library className="w-6 h-6" />
              <h1 className="text-3xl font-bold">Resource Library</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => window.location.href = '/resources'}>
                <Link2 className="w-4 h-4 mr-2" />
                Resources
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Available Resources</CardTitle>
                <CardDescription>
                  Browse and add resources to your organization
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    <SelectTrigger className="w-[200px]">
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className="group hover:shadow-lg transition-all duration-200 overflow-hidden relative"
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start gap-4">
                        {template.image_url ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100">
                            <img
                              src={template.image_url}
                              alt={template.title}
                              className="w-full h-full object-contain"
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
                                {template.title}
                              </h3>
                              {template.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {template.description}
                                </p>
                              )}
                              <div className="flex items-center mt-2 space-x-2">
                                <a 
                                  href={template.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary flex items-center space-x-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Visit site</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-4"
                        onClick={() => handleOpenAddDialog(template)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Organization
                      </Button>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isAddingToOrg} onOpenChange={(open) => {
        if (!open) {
          setIsAddingToOrg(false)
          setSelectedTemplate(null)
          setCustomizedResource({
            title: '',
            url: '',
            description: '',
            image_url: '',
            category_id: null
          })
          setSelectedTemplateCategory(null)
        } else {
          if (!selectedTenant) {
            const defaultOrg = getDefaultOrganization(tenants, userTenants)
            if (defaultOrg) {
              setSelectedTenant(defaultOrg)
            }
          }
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Resource to Organization</DialogTitle>
            <DialogDescription>
              Customize the resource before adding it to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select
                value={selectedTenant}
                onValueChange={setSelectedTenant}
                disabled={!userTenants.length}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedTenant && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={tenants.find(t => t.id === selectedTenant)?.avatar_url || undefined}
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
                  {tenants
                    .filter(tenant => userTenants.some(ut => ut.tenant_id === tenant.id))
                    .sort((a, b) => {
                      const aUserTenant = userTenants.find(ut => ut.tenant_id === a.id);
                      const bUserTenant = userTenants.find(ut => ut.tenant_id === b.id);
                      
                      // Sort by role priority: owner > admin > member
                      if (aUserTenant?.is_owner) return -1;
                      if (bUserTenant?.is_owner) return 1;
                      if (aUserTenant?.is_admin) return -1;
                      if (bUserTenant?.is_admin) return 1;
                      return 0;
                    })
                    .map((tenant) => {
                      const userTenant = userTenants.find(ut => ut.tenant_id === tenant.id);
                      const roleLabel = userTenant?.is_owner ? ' (Owner)' : 
                                      userTenant?.is_admin ? ' (Admin)' : '';
                      
                      return (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={tenant.avatar_url || undefined} />
                              <AvatarFallback>
                                {tenant.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{tenant.name}{roleLabel}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={customizedResource.title}
                onChange={(e) => setCustomizedResource(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter resource title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                value={customizedResource.url}
                onChange={(e) => setCustomizedResource(prev => ({ ...prev, url: e.target.value }))}
                placeholder="Enter resource URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={customizedResource.description}
                onChange={(e) => setCustomizedResource(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter resource description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input
                id="image_url"
                value={customizedResource.image_url}
                onChange={(e) => setCustomizedResource(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="Enter image URL"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              {selectedTemplateCategory && (
                <p className="text-sm text-muted-foreground mb-2">
                  Recommended category: {selectedTemplateCategory.name}
                </p>
              )}
              {!isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <Select
                    value={customizedResource.category_id?.toString()}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setIsAddingCategory(true)
                        if (selectedTemplateCategory) {
                          setNewCategory(selectedTemplateCategory.name)
                        }
                      } else {
                        setCustomizedResource(prev => ({ 
                          ...prev, 
                          category_id: parseInt(value)
                        }))
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-muted-foreground" />
                          {orgCategories.find(c => c.id === customizedResource.category_id)?.name || "Select a category"}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <div className="flex items-center gap-2 text-primary">
                          <Plus className="w-4 h-4" />
                          Create New Category
                        </div>
                      </SelectItem>
                      <div className="my-2 h-px bg-neutral-100" />
                      {orgCategories
                        .filter(category => category.tenant_id === selectedTenant)
                        .map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              {category.image_url ? (
                                <img 
                                  src={category.image_url} 
                                  alt={category.name}
                                  className="w-4 h-4 object-cover rounded"
                                />
                              ) : (
                                <Folder className="w-4 h-4 text-muted-foreground" />
                              )}
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Enter category name"
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={!newCategory}
                      className="flex-1"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Category
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
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingToOrg(false)
              setSelectedTemplate(null)
              setCustomizedResource({
                title: '',
                url: '',
                description: '',
                image_url: '',
                category_id: null
              })
              setSelectedTemplateCategory(null)
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToOrg}
              disabled={!selectedTenant || !customizedResource.title || !customizedResource.url}
            >
              Add to Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 