import { useState, useEffect } from 'react'
import { useToast } from "@/hooks/use-toast"
import { Resource, Category, Tenant, UserTenant } from '../types'

export function useResources() {
  const [resources, setResources] = useState<Resource[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [userTenants, setUserTenants] = useState<UserTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources')
      
      if (response.status === 401) {
        window.location.href = '/'
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch resources')
      }

      const data = await response.json()
      
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

  const addResource = async (resourceData: Partial<Resource>) => {
    try {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceData),
      })

      if (!response.ok) throw new Error('Failed to add resource')

      const addedResource = await response.json()
      setResources(prev => [...prev, addedResource])
      
      toast({
        title: "Resource added",
        description: "Your new resource has been added successfully.",
      })

      return addedResource
    } catch (error) {
      console.error('Error adding resource:', error)
      toast({
        title: "Failed to add resource",
        description: "There was an error adding your resource. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const updateResource = async (resourceId: number, resourceData: Partial<Resource>) => {
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update resource')
      }

      const updatedResource = await response.json()
      setResources(prev => prev.map(r => 
        r.id === updatedResource.id ? updatedResource : r
      ))

      toast({
        title: "Resource updated",
        description: "Your changes have been saved.",
      })

      return updatedResource
    } catch (error) {
      console.error('Error updating resource:', error)
      toast({
        title: "Failed to update resource",
        description: error instanceof Error ? error.message : "There was an error updating the resource. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteResource = async (resourceId: number, pin: string) => {
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!response.ok) throw new Error('Failed to delete resource')

      setResources(prev => prev.filter(r => r.id !== resourceId))

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
      throw error
    }
  }

  return {
    resources,
    categories,
    tenants,
    userTenants,
    isLoading,
    addResource,
    updateResource,
    deleteResource,
    fetchResources
  }
} 