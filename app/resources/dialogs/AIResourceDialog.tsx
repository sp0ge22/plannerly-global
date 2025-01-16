import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LoadAndErrorButton } from '@/components/ui/loadbutton'
import { Sparkles, Link2, Edit2, Plus } from 'lucide-react'
import { AIResourceSuggestion, Resource, Tenant } from '../types'

interface AIResourceDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddResource: (resource: Partial<Resource>) => void
  tenants: Tenant[]
  isLoadingAI: boolean
  aiResourceSuggestion: AIResourceSuggestion | null
  onGetAISuggestion: (companyName: string) => Promise<void>
  selectedTenantId: string
}

export function AIResourceDialog({
  isOpen,
  onClose,
  onAddResource,
  tenants,
  isLoadingAI,
  aiResourceSuggestion,
  onGetAISuggestion,
  selectedTenantId
}: AIResourceDialogProps) {
  const [resourceUrl, setResourceUrl] = useState('')
  const [buttonVariant, setButtonVariant] = useState<"neutral" | "loading" | "error" | "success">("neutral")

  const handleAnalyze = async () => {
    if (!resourceUrl) return

    setButtonVariant("loading")
    try {
      await onGetAISuggestion(resourceUrl)
      setButtonVariant("success")
      setTimeout(() => {
        setButtonVariant("neutral")
      }, 1000)
    } catch (error) {
      setButtonVariant("error")
      setTimeout(() => {
        setButtonVariant("neutral")
      }, 1000)
    }
  }

  const handleAddAISuggestion = () => {
    if (!aiResourceSuggestion) return

    onAddResource({
      title: aiResourceSuggestion.title,
      description: aiResourceSuggestion.description,
      url: aiResourceSuggestion.url,
      image_url: aiResourceSuggestion.image_url,
      tenant_id: selectedTenantId,
      category_id: aiResourceSuggestion.category_id || null
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                value={selectedTenantId}
                onValueChange={(value) => onAddResource({ ...aiResourceSuggestion, tenant_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization">
                    {selectedTenantId && (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={tenants.find(t => t.id === selectedTenantId)?.avatar_url || undefined}
                          />
                          <AvatarFallback>
                            {tenants.find(t => t.id === selectedTenantId)?.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{tenants.find(t => t.id === selectedTenantId)?.name}</span>
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
                    onClick={handleAnalyze}
                    disabled={!resourceUrl || !selectedTenantId}
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

            {!selectedTenantId && (
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
              onClose()
              onAddResource({})
            }}
            className="w-full text-muted-foreground hover:text-primary"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Prefer to add manually? Click here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 