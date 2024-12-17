'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Wand2, RefreshCw, MessageSquare, Plus, Trash2, Library, Sparkles } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical } from 'lucide-react'

type EmailType = 'response' | 'rewrite'
type Tenant = {
  id: string
  name: string
  avatar_url?: string | null
}

type TenantResponse = {
  tenant_id: string
  tenants: Tenant | null
}

type EmailPrompt = {
  id: string
  title: string
  prompt: string
  description: string | null
  type: EmailType
  tenant_id: string
  created_by: string
  tenant: {
    name: string
    avatar_url: string | null
  }
  creator: {
    name: string
    avatar_url: string | null
  }
}

export default function EmailAssistantPage() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [refinementText, setRefinementText] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [selectedPrompt, setSelectedPrompt] = useState<string>('')
  const [mode, setMode] = useState<EmailType>('response')
  const [isGenerating, setIsGenerating] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [prompts, setPrompts] = useState<EmailPrompt[]>([])
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    prompt: '',
    description: null as string | null,
    type: 'response' as EmailType,
    tenant_id: ''
  })
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [isAddingPromptWithAI, setIsAddingPromptWithAI] = useState(false)
  const [promptDescription, setPromptDescription] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [isEditingWithAI, setIsEditingWithAI] = useState(false)
  const [editInstruction, setEditInstruction] = useState('')
  const [isGeneratingEdit, setIsGeneratingEdit] = useState(false)
  
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchTenants = async () => {
      const { data: userTenants, error } = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          tenants:tenant_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .returns<TenantResponse[]>()

      if (error) {
        console.error('Error fetching tenants:', error)
        toast({
          title: "Error fetching organizations",
          description: "Could not load your organizations.",
          variant: "destructive",
        })
        return
      }

      const fetchedTenants = userTenants
        .map(ut => ut.tenants)
        .filter((tenant): tenant is Tenant => 
          tenant !== null && 
          typeof tenant === 'object' &&
          'id' in tenant &&
          'name' in tenant
        )

      setTenants(fetchedTenants)
      if (fetchedTenants.length > 0 && !selectedTenant) {
        setSelectedTenant(fetchedTenants[0].id)
        setNewPrompt(prev => ({ ...prev, tenant_id: fetchedTenants[0].id }))
      }
    }

    fetchTenants()
  }, [supabase, selectedTenant])

  useEffect(() => {
    const fetchPrompts = async () => {
      const response = await fetch('/api/email-prompts')
      if (!response.ok) {
        toast({
          title: "Error fetching prompts",
          description: "Could not load email prompts.",
          variant: "destructive",
        })
        return
      }
      const data = await response.json()
      setPrompts(data)
    }

    fetchPrompts()
  }, [])

  const handleAddPrompt = async () => {
    if (!newPrompt.title || !newPrompt.prompt || !newPrompt.tenant_id) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch('/api/email-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrompt),
      })

      if (!response.ok) throw new Error('Failed to create prompt')

      const data = await response.json()
      setPrompts([data, ...prompts])
      setIsAddingPrompt(false)
      setNewPrompt({
        title: '',
        prompt: '',
        description: null,
        type: 'response',
        tenant_id: selectedTenant
      })

      toast({
        title: "Prompt created",
        description: "Your new email prompt has been created.",
      })
    } catch (error) {
      console.error('Error creating prompt:', error)
      toast({
        title: "Error creating prompt",
        description: "Could not create the email prompt.",
        variant: "destructive",
      })
    }
  }

  const handleDeletePrompt = async (id: string) => {
    try {
      const response = await fetch('/api/email-prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!response.ok) throw new Error('Failed to delete prompt')

      setPrompts(prompts.filter(p => p.id !== id))
      toast({
        title: "Prompt deleted",
        description: "The email prompt has been deleted.",
      })
    } catch (error) {
      console.error('Error deleting prompt:', error)
      toast({
        title: "Error deleting prompt",
        description: "Could not delete the email prompt.",
        variant: "destructive",
      })
    }
  }

  const generateEmail = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please paste the email you want to work with.",
        variant: "destructive",
      })
      return
    }

    if (!selectedPrompt && mode === 'response') {
      toast({
        title: "Prompt required",
        description: "Please select an email prompt.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt)
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          prompt: selectedPromptData?.prompt || '',
          mode
        }),
      })

      if (!response.ok) throw new Error('Failed to generate email')

      const data = await response.json()
      setOutputText(data.content)
      setRefinementText('')
    } catch (error) {
      console.error('Error generating email:', error)
      toast({
        title: "Generation failed",
        description: "There was an error generating the email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const refineEmail = async () => {
    if (!refinementText.trim()) {
      toast({
        title: "Refinement instructions needed",
        description: "Please enter how you'd like to modify the email.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: `Original email: "${outputText}"\n\nPlease modify this email with the following changes: ${refinementText}`,
          prompt: "Rewrite this email with the requested changes while maintaining appropriate tone and clarity."
        }),
      })

      if (!response.ok) throw new Error('Failed to refine email')

      const data = await response.json()
      setOutputText(data.content)
      setRefinementText('')
    } catch (error) {
      console.error('Error refining email:', error)
      toast({
        title: "Refinement failed",
        description: "There was an error refining the email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditPrompt = async () => {
    if (!editingPromptId) return

    try {
      const response = await fetch('/api/email-prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPromptId,
          ...newPrompt
        }),
      })

      if (!response.ok) throw new Error('Failed to update prompt')

      const updatedPrompt = await response.json()
      setPrompts(prompts.map(p => p.id === editingPromptId ? updatedPrompt : p))
      setIsEditingPrompt(false)
      setEditingPromptId(null)
      setNewPrompt({
        title: '',
        prompt: '',
        description: null,
        type: 'response',
        tenant_id: selectedTenant
      })

      toast({
        title: "Prompt updated",
        description: "Your email prompt has been updated.",
      })
    } catch (error) {
      console.error('Error updating prompt:', error)
      toast({
        title: "Error updating prompt",
        description: "Could not update the email prompt.",
        variant: "destructive",
      })
    }
  }

  const startEditingPrompt = (prompt: EmailPrompt) => {
    setNewPrompt({
      title: prompt.title,
      prompt: prompt.prompt,
      description: prompt.description,
      type: prompt.type,
      tenant_id: prompt.tenant_id
    })
    setEditingPromptId(prompt.id)
    setIsEditingPrompt(true)
  }

  const filteredPrompts = selectedTenant
    ? prompts.filter(p => p.tenant_id === selectedTenant && p.type === mode)
    : []

  const generatePromptWithAI = async () => {
    if (!promptDescription.trim()) {
      toast({
        title: "Description required",
        description: "Please describe what kind of prompt you want to create.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingPrompt(true)
    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: promptDescription,
          type: newPrompt.type
        }),
      })

      if (!response.ok) throw new Error('Failed to generate prompt')

      const data = await response.json()
      setNewPrompt({
        ...newPrompt,
        title: data.title,
        description: data.description,
        prompt: data.prompt
      })
      setIsAddingPromptWithAI(false)
      setIsAddingPrompt(true)
      setPromptDescription('')

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
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const editPromptWithAI = async () => {
    if (!editInstruction.trim()) {
      toast({
        title: "Instruction required",
        description: "Please provide instructions for how to modify the prompt.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingEdit(true)
    try {
      const response = await fetch('/api/edit-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPrompt: newPrompt,
          instruction: editInstruction,
          type: newPrompt.type
        }),
      })

      if (!response.ok) throw new Error('Failed to edit prompt')

      const data = await response.json()
      setNewPrompt({
        ...newPrompt,
        title: data.title,
        description: data.description,
        prompt: data.prompt
      })
      setIsEditingWithAI(false)
      setEditInstruction('')

      toast({
        title: "Prompt updated",
        description: "Review the AI-edited prompt before saving.",
      })
    } catch (error) {
      console.error('Error editing prompt:', error)
      toast({
        title: "Edit failed",
        description: "There was an error editing the prompt. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingEdit(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-6 h-6" />
              <h1 className="text-3xl font-bold">Email Assistant</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => window.location.href = '/prompt-library'}>
                <Library className="w-4 h-4 mr-2" />
                Prompt Library
              </Button>
              <Button variant="outline" onClick={() => {
                setNewPrompt({
                  ...newPrompt,
                  type: mode
                })
                setIsAddingPromptWithAI(true)
              }}>
                <Sparkles className="w-4 h-4 mr-2" />
                Add Prompt with AI
              </Button>
              <Button onClick={() => setIsAddingPrompt(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Prompt
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  variant={mode === 'response' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('response')
                    setSelectedPrompt('')
                  }}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Generate Response
                </Button>
                <Button
                  variant={mode === 'rewrite' ? 'default' : 'outline'}
                  onClick={() => {
                    setMode('rewrite')
                    setSelectedPrompt('')
                  }}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rewrite Email
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Organization</Label>
                <Select
                  value={selectedTenant}
                  onValueChange={(value) => {
                    setSelectedTenant(value)
                    setSelectedPrompt('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization">
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
                <Label>Email Prompt</Label>
                <Select
                  value={selectedPrompt}
                  onValueChange={(value) => {
                    if (value === 'new') {
                      setIsAddingPrompt(true)
                      return
                    }
                    if (value === 'library') {
                      window.location.href = '/prompt-library'
                      return
                    }
                    setSelectedPrompt(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a prompt">
                      {selectedPrompt && (
                        <span className="font-medium">
                          {prompts.find(p => p.id === selectedPrompt)?.title}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new" className="border-b">
                      <div className="flex items-center space-x-2 text-primary">
                        <Plus className="h-4 w-4" />
                        <span>Add New Prompt</span>
                      </div>
                    </SelectItem>
                    {filteredPrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        <div className="flex flex-col gap-1 max-w-[400px]">
                          <span className="font-medium truncate">{prompt.title}</span>
                          {prompt.description && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {prompt.description}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="library" className="border-t">
                      <div className="flex items-center space-x-2 text-primary">
                        <Library className="h-4 w-4" />
                        <span>Open Prompt Library</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{mode === 'response' ? 'Original Email' : 'Email to Rewrite'}</Label>
                <Textarea
                  placeholder={mode === 'response' 
                    ? "Paste the email you want to respond to..."
                    : "Paste the email you want to rewrite..."
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <Button
                onClick={generateEmail}
                disabled={isGenerating || !inputText.trim() || (mode === 'response' && !selectedPrompt)}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'response' ? 'Generating Response...' : 'Rewriting...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {mode === 'response' ? 'Generate Response' : 'Rewrite Email'}
                  </>
                )}
              </Button>

              {outputText && (
                <>
                  <div className="space-y-2">
                    <Label>{mode === 'response' ? 'Generated Response' : 'Rewritten Email'}</Label>
                    <Textarea
                      value={outputText}
                      readOnly
                      className="min-h-[200px]"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(outputText)
                        toast({
                          title: "Copied to clipboard",
                          description: "The email has been copied to your clipboard.",
                        })
                      }}
                    >
                      Copy to Clipboard
                    </Button>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Further Refinements</Label>
                    <Textarea
                      placeholder="Enter instructions for additional changes..."
                      value={refinementText}
                      onChange={(e) => setRefinementText(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button
                      onClick={refineEmail}
                      disabled={isGenerating || !refinementText.trim()}
                      variant="secondary"
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Refining...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Refine Email
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={isAddingPrompt || isEditingPrompt} onOpenChange={(open) => {
        if (!open) {
          setIsAddingPrompt(false)
          setIsEditingPrompt(false)
          setEditingPromptId(null)
          setNewPrompt({
            title: '',
            prompt: '',
            description: null,
            type: 'response',
            tenant_id: selectedTenant
          })
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditingPrompt ? 'Edit Email Prompt' : 'Add Email Prompt'}</DialogTitle>
            <DialogDescription>
              {isEditingPrompt ? 'Edit your email prompt.' : 'Create a new email prompt for your organization.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={newPrompt.title}
                onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                placeholder="Enter prompt title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newPrompt.description || ''}
                onChange={(e) => setNewPrompt({ ...newPrompt, description: e.target.value || null })}
                placeholder="Enter a brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={newPrompt.prompt}
                onChange={(e) => setNewPrompt({ ...newPrompt, prompt: e.target.value })}
                placeholder="Enter the prompt text..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={newPrompt.type}
                onValueChange={(value: EmailType) => setNewPrompt({ ...newPrompt, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select prompt type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="response">Response</SelectItem>
                  <SelectItem value="rewrite">Rewrite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Select
                value={newPrompt.tenant_id}
                onValueChange={(value) => setNewPrompt({ ...newPrompt, tenant_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddingPrompt(false)
              setIsEditingPrompt(false)
              setEditingPromptId(null)
              setNewPrompt({
                title: '',
                prompt: '',
                description: null,
                type: 'response',
                tenant_id: selectedTenant
              })
            }}>
              Cancel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsEditingWithAI(true)}
              className="mr-2"
              disabled={!newPrompt.prompt.trim()}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {isEditingPrompt ? 'Edit with AI' : 'Refine with AI'}
            </Button>
            <Button onClick={isEditingPrompt ? handleEditPrompt : handleAddPrompt}>
              {isEditingPrompt ? 'Save Changes' : 'Add Prompt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddingPromptWithAI} onOpenChange={setIsAddingPromptWithAI}>
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
            <Button variant="outline" onClick={() => {
              setIsAddingPromptWithAI(false)
              setPromptDescription('')
            }}>
              Cancel
            </Button>
            <Button 
              onClick={generatePromptWithAI}
              disabled={isGeneratingPrompt || !promptDescription.trim()}
            >
              {isGeneratingPrompt ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Prompt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingWithAI} onOpenChange={setIsEditingWithAI}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Prompt with AI</DialogTitle>
            <DialogDescription>
              Describe how you want to modify the prompt (e.g., "make it shorter", "make it more formal", etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-instruction">How would you like to modify the prompt?</Label>
              <Textarea
                id="edit-instruction"
                value={editInstruction}
                onChange={(e) => setEditInstruction(e.target.value)}
                placeholder="Example: Make it more concise while maintaining professionalism..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditingWithAI(false)
              setEditInstruction('')
            }}>
              Cancel
            </Button>
            <Button onClick={editPromptWithAI} disabled={isGeneratingEdit}>
              {isGeneratingEdit ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Editing...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Edit with AI
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 