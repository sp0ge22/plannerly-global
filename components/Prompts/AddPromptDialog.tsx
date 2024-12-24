import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Sparkles, Edit2, MessageSquare, RefreshCw, Wand2 } from 'lucide-react'
import { LoadAndErrorButton } from '@/components/ui/loadbutton'

type EmailType = 'response' | 'rewrite'

interface AddPromptDialogProps {
  isOpen: boolean
  onClose: () => void
  onPromptGenerated: (prompt: {
    title: string
    description: string | null
    prompt: string
  }) => void
  type: EmailType
  skipSuggestion?: boolean
}

export function AddPromptDialog({
  isOpen,
  onClose,
  onPromptGenerated,
  type,
  skipSuggestion = false
}: AddPromptDialogProps) {
  const [promptDescription, setPromptDescription] = useState('')
  const [buttonVariant, setButtonVariant] = useState<"neutral" | "loading" | "error" | "success">("neutral")
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(!skipSuggestion)
  const [isAddingPromptWithAI, setIsAddingPromptWithAI] = useState(skipSuggestion)
  const { toast } = useToast()

  // Reset state when dialog is opened
  useEffect(() => {
    if (isOpen) {
      setShowSuggestionDialog(!skipSuggestion)
      setIsAddingPromptWithAI(skipSuggestion)
      setPromptDescription('')
      setButtonVariant("neutral")
    }
  }, [isOpen, skipSuggestion])

  const generatePromptWithAI = async () => {
    if (!promptDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what kind of prompt you want to create.",
        variant: "destructive",
      })
      return
    }

    setButtonVariant("loading")
    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: promptDescription,
          type
        }),
      })

      if (!response.ok) throw new Error('Failed to generate prompt')

      const data = await response.json()
      
      // Show success state
      setButtonVariant("success")
      
      // Wait for success animation
      setTimeout(() => {
        // Pass the generated prompt back to parent
        onPromptGenerated(data)
        
        // Close dialogs and reset state
        setIsAddingPromptWithAI(false)
        setShowSuggestionDialog(true)
        setPromptDescription('')
        
        // Reset button state
        setButtonVariant("neutral")
      }, 1000)

      toast({
        title: "Prompt generated",
        description: "Review and edit the generated prompt before saving.",
      })
    } catch (error) {
      console.error('Error generating prompt:', error)
      toast({
        title: "Generation failed",
        description: "There was an error generating the prompt. Please try again.",
        variant: "destructive",
      })
      
      // Show error state
      setButtonVariant("error")
      
      // Reset button after error animation
      setTimeout(() => {
        setButtonVariant("neutral")
      }, 1000)
    }
  }

  const handleSuggestionResponse = (useAI: boolean) => {
    setShowSuggestionDialog(false)
    if (useAI) {
      setIsAddingPromptWithAI(true)
    } else {
      onPromptGenerated({
        title: '',
        description: null,
        prompt: ''
      })
    }
  }

  return (
    <>
      <Dialog open={isOpen && showSuggestionDialog} onOpenChange={(open) => {
        if (!open) onClose()
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">Try AI-Assisted Creation?</DialogTitle>
                <DialogDescription className="text-base">
                  Let AI help you craft the perfect email prompt
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
                  <h4 className="font-medium mb-1">Intelligent Generation</h4>
                  <p className="text-sm text-muted-foreground">
                    AI will help you create detailed, effective email handling instructions based on your description
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <RefreshCw className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Easy Refinement</h4>
                  <p className="text-sm text-muted-foreground">
                    Review and refine the generated prompt until it's exactly what you need
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Natural Description</h4>
                  <p className="text-sm text-muted-foreground">
                    Just describe what you want in plain language, and AI will do the heavy lifting
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2 pt-3 border-t">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Need help? Check out our <Button variant="link" className="h-auto p-0" onClick={() => window.location.href = '/help/email-assistant'}>guides and documentation</Button>
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => handleSuggestionResponse(false)}>
              <Edit2 className="w-4 h-4 mr-2" />
              I'll create it manually
            </Button>
            <Button onClick={() => handleSuggestionResponse(true)} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Use AI Assistant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen && isAddingPromptWithAI} onOpenChange={(open) => {
        if (!open && buttonVariant === "neutral") {
          setIsAddingPromptWithAI(false)
          setShowSuggestionDialog(true)
          setPromptDescription('')
          onClose()
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Prompt with AI</DialogTitle>
            <DialogDescription>
              Describe what kind of prompt you want to create, and AI will help you generate it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt-description">What kind of prompt do you want to create?</Label>
              <Textarea
                id="prompt-description"
                value={promptDescription}
                onChange={(e) => setPromptDescription(e.target.value)}
                placeholder="Example: I want a prompt that helps me write polite rejection emails to vendors..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                if (buttonVariant === "neutral") {
                  setIsAddingPromptWithAI(false)
                  setShowSuggestionDialog(true)
                  setPromptDescription('')
                  onClose()
                }
              }}
              disabled={buttonVariant !== "neutral"}
            >
              Cancel
            </Button>
            <LoadAndErrorButton
              onClick={generatePromptWithAI}
              disabled={!promptDescription.trim()}
              variant={buttonVariant}
              text="Generate Prompt"
              icon={<Sparkles className="w-4 h-4" />}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
} 