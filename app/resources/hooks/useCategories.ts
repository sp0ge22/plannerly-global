import { useState } from 'react'
import { useToast } from "@/hooks/use-toast"
import { Category } from '../types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const { toast } = useToast()

  const addCategory = async (categoryData: { name: string, tenant_id: string }) => {
    try {
      // Check if category already exists for this tenant
      const existingCategory = categories.find(
        cat => cat.name.toLowerCase() === categoryData.name.toLowerCase() && 
        cat.tenant_id === categoryData.tenant_id
      )

      if (existingCategory) {
        toast({
          title: "Category exists",
          description: "This category already exists and has been selected.",
        })
        return existingCategory
      }

      const response = await fetch('/api/resources/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add category')
      }

      if (!data.id) {
        throw new Error('No category ID returned')
      }

      // Update local categories state
      setCategories(prev => {
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

  const updateCategory = async (categoryId: number, categoryData: Partial<Category>) => {
    try {
      const response = await fetch(`/api/resources/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      })

      if (!response.ok) throw new Error('Failed to update category')

      const updatedCategory = await response.json()
      
      setCategories(prev => prev.map(c => 
        c.id === updatedCategory.id ? updatedCategory : c
      ))

      toast({
        title: "Category updated",
        description: "Your changes have been saved.",
      })

      return updatedCategory
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Failed to update category",
        description: "There was an error updating the category. Please try again.",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteCategory = async (categoryId: number, tenantId: string) => {
    try {
      const response = await fetch(`/api/resources/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete category')
      }

      setCategories(prev => prev.filter(c => c.id !== categoryId))
      
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
      throw error
    }
  }

  return {
    categories,
    setCategories,
    addCategory,
    updateCategory,
    deleteCategory
  }
} 