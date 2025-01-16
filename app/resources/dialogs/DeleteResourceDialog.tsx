import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Trash2, Link2 } from 'lucide-react'
import { Resource, Tenant } from '../types'

interface DeleteResourceDialogProps {
  isOpen: boolean
  onClose: () => void
  onDelete: (pin: string) => Promise<void>
  resource: Resource | null
  tenants: Tenant[]
}

export function DeleteResourceDialog({
  isOpen,
  onClose,
  onDelete,
  resource,
  tenants
}: DeleteResourceDialogProps) {
  const [pin, setPin] = useState('')

  const handleClose = () => {
    setPin('')
    onClose()
  }

  const handleDelete = async () => {
    await onDelete(pin)
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={tenants.find(t => t.id === resource?.tenant_id)?.avatar_url ?? undefined} />
              <AvatarFallback>
                {tenants.find(t => t.id === resource?.tenant_id)?.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-xl">Confirm Deletion</DialogTitle>
              <DialogDescription className="mt-1">
                Enter {tenants.find(t => t.id === resource?.tenant_id)?.name}'s PIN to delete this resource
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="mt-6">
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Resource to Delete:</h4>
              <div className="flex items-start gap-3">
                {resource?.image_url ? (
                  <img 
                    src={resource.image_url} 
                    alt={resource.title}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-neutral-400" />
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm">{resource?.title}</p>
                  {resource?.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {resource.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label htmlFor="pin" className="text-sm font-medium">
                Organization PIN
              </label>
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
            onClick={handleClose}
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
  )
} 