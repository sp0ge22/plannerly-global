import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Link2 } from 'lucide-react'
import { Resource, Tenant } from "../types"

interface ResourceCardProps {
  resource: Resource
  onEdit: () => void
  onDelete: () => void
  tenants: Tenant[]
}

export function ResourceCard({ resource, onEdit, onDelete, tenants }: ResourceCardProps) {
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