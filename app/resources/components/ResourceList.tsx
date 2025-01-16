import { motion } from 'framer-motion'
import { Loader2, Library, Folder } from 'lucide-react'
import { ResourceCard } from './ResourceCard'
import { Resource, Category, Tenant } from '../types'

interface ResourceListProps {
  isLoading: boolean
  resources: Resource[]
  categories: Category[]
  tenants: Tenant[]
  selectedCategory: string
  onEditResource: (resource: Resource) => void
  onDeleteResource: (resource: Resource) => void
}

export function ResourceList({
  isLoading,
  resources,
  categories,
  tenants,
  selectedCategory,
  onEditResource,
  onDeleteResource
}: ResourceListProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center h-64 space-y-4"
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading resources...</p>
      </motion.div>
    )
  }

  if (resources.length === 0) {
    return (
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
            Get started by adding your first resource using the 'Add Resource' button above.
          </p>
        </div>
      </motion.div>
    )
  }

  if (selectedCategory === 'all') {
    // Show all categories
    return (
      <>
        {categories
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(category => {
            const categoryResources = resources.filter(
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
                  <h2 className="text-lg font-semibold">
                    {category.name}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryResources.map((resource) => (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      onEdit={() => onEditResource(resource)}
                      onDelete={() => onDeleteResource(resource)}
                      tenants={tenants}
                    />
                  ))}
                </div>
              </motion.div>
            )
          })}
      </>
    )
  }

  // Show selected category
  return (
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
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            onEdit={() => onEditResource(resource)}
            onDelete={() => onDeleteResource(resource)}
            tenants={tenants}
          />
        ))}
      </div>
    </motion.div>
  )
} 