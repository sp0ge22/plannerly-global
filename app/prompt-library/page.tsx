'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Library, Plus, Edit2, Trash2, MessageSquare, RefreshCw, Wand2, Loader2, Sparkles, ChevronDown, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type EmailType = 'response' | 'rewrite'

type Tenant = {
  id: string
  name: string
  avatar_url: string | null
}

type TenantResponse = {
  tenant_id: string
  tenants: {
    id: string
    name: string
    avatar_url: string | null
  } | null
}

type EmailPrompt = {
  id: string
  title: string
  prompt: string
  description: string | null
  type: EmailType
  tenant_id: string
  created_by: string
  created_at: string
  tenant: {
    name: string
    avatar_url: string | null
  }
  creator: {
    name: string
    avatar_url: string | null
  }
}

export default function PromptLibraryPage() {
  const [prompts, setPrompts] = useState<EmailPrompt[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('_all')
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [isEditingPrompt, setIsEditingPrompt] = useState(false)
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<EmailType>('response')
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    prompt: '',
    description: null as string | null,
    type: 'response' as EmailType,
    tenant_id: ''
  })
  const [isEditingWithAI, setIsEditingWithAI] = useState(false)
  const [editInstruction, setEditInstruction] = useState('')
  const [isGeneratingEdit, setIsGeneratingEdit] = useState(false)
  const [isAddingPromptWithAI, setIsAddingPromptWithAI] = useState(false)
  const [promptDescription, setPromptDescription] = useState('')
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({})
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinValue, setPinValue] = useState('')
  const [promptToDelete, setPromptToDelete] = useState<EmailPrompt | null>(null)
  const [isVerifyingPin, setIsVerifyingPin] = useState(false)

  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchTenants = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
        .eq('user_id', user.id)
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
          'name' in tenant &&
          typeof tenant.id === 'string' &&
          typeof tenant.name === 'string'
        )

      setTenants(fetchedTenants)
      if (fetchedTenants.length > 0) {
        setNewPrompt(prev => ({ ...prev, tenant_id: fetchedTenants[0].id }))
      }
    }

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

    fetchTenants()
    fetchPrompts()
  }, [supabase])

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

  const handleDeletePrompt = async (prompt: EmailPrompt) => {
    setPromptToDelete(prompt)
    setPinValue('')
    setShowPinDialog(true)
  }

  const verifyPinAndDelete = async () => {
    if (!promptToDelete || !pinValue.trim()) return

    setIsVerifyingPin(true)
    try {
      // Verify PIN with the backend
      const response = await fetch('/api/verify-org-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tenant_id: promptToDelete.tenant_id,
          pin: pinValue
        }),
      })

      if (!response.ok) {
        throw new Error('Invalid PIN')
      }

      // If PIN is verified, proceed with deletion
      const deleteResponse = await fetch('/api/email-prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promptToDelete.id }),
      })

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete prompt')
      }

      setPrompts(prompts.filter(p => p.id !== promptToDelete.id))
      setShowPinDialog(false)
      setPromptToDelete(null)
      setPinValue('')

      toast({
        title: "Prompt deleted",
        description: "The email prompt has been deleted.",
      })
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not delete the email prompt.",
        variant: "destructive",
      })
    } finally {
      setIsVerifyingPin(false)
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

  const filteredPrompts = prompts.filter(p => 
    (selectedTenant === '_all' || p.tenant_id === selectedTenant) &&
    p.type === selectedType
  )

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

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }))
  }

  const handleAddPromptClick = () => {
    setShowSuggestionDialog(true)
  }

  const handleSuggestionResponse = (useAI: boolean) => {
    setShowSuggestionDialog(false)
    if (useAI) {
      setIsAddingPromptWithAI(true)
    } else {
      setIsAddingPrompt(true)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Library className="w-6 h-6" />
              <h1 className="text-3xl font-bold">Prompt Library</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" onClick={() => window.location.href = '/help/email-assistant'}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Help & Guides
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/email-assistant'}>
                <Mail className="w-4 h-4 mr-2" />
                Email Assistant
              </Button>
              <Button variant="outline" onClick={() => {
                setNewPrompt({
                  ...newPrompt,
                  type: selectedType
                })
                setIsAddingPromptWithAI(true)
              }}>
                <Sparkles className="w-4 h-4 mr-2" />
                Add Prompt with AI
              </Button>
              <Button onClick={handleAddPromptClick}>
                <Plus className="w-4 h-4 mr-2" />
                Add Prompt
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Email Prompts</CardTitle>
                    <CardDescription>
                      Manage your organization's email prompts
                    </CardDescription>
                  </div>
                  <Select
                    value={selectedTenant}
                    onValueChange={setSelectedTenant}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Organizations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">All Organizations</SelectItem>
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
              </CardHeader>
              <CardContent>
                <Tabs 
                  value={selectedType} 
                  onValueChange={(value) => setSelectedType(value as EmailType)}
                  defaultValue="response"
                >
                  <TabsList className="mb-4">
                    <TabsTrigger value="response" className="space-x-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Response Prompts</span>
                    </TabsTrigger>
                    <TabsTrigger value="rewrite" className="space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>Rewrite Prompts</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="response" className="space-y-4">
                    {filteredPrompts.map((prompt) => (
                      <Card key={prompt.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <CardTitle>{prompt.title}</CardTitle>
                              {prompt.description && (
                                <CardDescription>
                                  {prompt.description}
                                </CardDescription>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditingPrompt(prompt)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePrompt(prompt)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePrompt(prompt.id)}
                              >
                                <motion.div
                                  animate={{ rotate: expandedPrompts[prompt.id] ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </motion.div>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={prompt.tenant.avatar_url || undefined} />
                              <AvatarFallback>
                                {prompt.tenant.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{prompt.tenant.name}</span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <span>Created by</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={prompt.creator.avatar_url || undefined} />
                                <AvatarFallback>
                                  {prompt.creator.name?.slice(0, 2).toUpperCase() || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{prompt.creator.name}</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(prompt.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}</span>
                          </div>
                        </CardHeader>
                        <AnimatePresence initial={false}>
                          {expandedPrompts[prompt.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CardContent className="space-y-4">
                                <div className="font-medium text-sm">Prompt</div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {prompt.prompt}
                                </p>
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    ))}
                  </TabsContent>

                  <TabsContent value="rewrite" className="space-y-4">
                    {filteredPrompts.map((prompt) => (
                      <Card key={prompt.id}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <CardTitle>{prompt.title}</CardTitle>
                              {prompt.description && (
                                <CardDescription>
                                  {prompt.description}
                                </CardDescription>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => startEditingPrompt(prompt)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePrompt(prompt)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePrompt(prompt.id)}
                              >
                                <motion.div
                                  animate={{ rotate: expandedPrompts[prompt.id] ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </motion.div>
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={prompt.tenant.avatar_url || undefined} />
                              <AvatarFallback>
                                {prompt.tenant.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{prompt.tenant.name}</span>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <span>Created by</span>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={prompt.creator.avatar_url || undefined} />
                                <AvatarFallback>
                                  {prompt.creator.name?.slice(0, 2).toUpperCase() || '??'}
                                </AvatarFallback>
                              </Avatar>
                              <span>{prompt.creator.name}</span>
                            </span>
                            <span>•</span>
                            <span>{new Date(prompt.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}</span>
                          </div>
                        </CardHeader>
                        <AnimatePresence initial={false}>
                          {expandedPrompts[prompt.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CardContent className="space-y-4">
                                <div className="font-medium text-sm">Prompt</div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {prompt.prompt}
                                </p>
                              </CardContent>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
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
                className="min-h-[200px]"
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

      <Dialog open={showSuggestionDialog} onOpenChange={setShowSuggestionDialog}>
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

      <Dialog open={showPinDialog} onOpenChange={(open) => {
        if (!open) {
          setShowPinDialog(false)
          setPromptToDelete(null)
          setPinValue('')
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={promptToDelete?.tenant.avatar_url ?? undefined} />
                <AvatarFallback>
                  {promptToDelete?.tenant.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">Confirm Deletion</DialogTitle>
                <DialogDescription className="mt-1">
                  Enter {promptToDelete?.tenant.name}'s PIN to delete this prompt
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-6">
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Prompt to Delete:</h4>
                <p className="text-sm text-muted-foreground">{promptToDelete?.title}</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="pin" className="text-sm font-medium">
                  Organization PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pinValue}
                  onChange={(e) => setPinValue(e.target.value)}
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
                setShowPinDialog(false)
                setPromptToDelete(null)
                setPinValue('')
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={verifyPinAndDelete}
              disabled={isVerifyingPin || !pinValue.trim() || pinValue.length !== 4}
            >
              {isVerifyingPin ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Prompt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 