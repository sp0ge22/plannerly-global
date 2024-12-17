'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Library, MessageSquare, RefreshCw, Sparkles, Wand2, Plus } from 'lucide-react'
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type ExpandedPrompts = {
  [key: string]: boolean;
}

const systemMessage = `I am an AI assistant that can help you understand how to use the Email Assistant and Prompt Library. 
I can explain:
- How to create and manage email prompts
- How to generate email responses
- How to rewrite emails
- Best practices for using the system
- Tips for creating effective prompts

Feel free to ask any questions about these topics!`

export default function EmailAssistantHelpPage() {
  const [userMessage, setUserMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([
    { role: 'assistant', content: 'Hello! How can I help you understand the Email Assistant and Prompt Library?' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [expandedPrompts, setExpandedPrompts] = useState<ExpandedPrompts>({})
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [selectedExample, setSelectedExample] = useState<{
    title: string;
    description: string | null;
    instructions: string;
    type: 'response' | 'rewrite';
  } | null>(null)
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    prompt: '',
    description: null as string | null,
    type: 'response' as 'response' | 'rewrite',
    tenant_id: ''
  })
  const [tenants, setTenants] = useState<Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>>([])

  useEffect(() => {
    const fetchTenants = async () => {
      const supabase = createClientComponentClient()
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

      if (error) {
        console.error('Error fetching tenants:', error)
        toast({
          title: "Error fetching organizations",
          description: "Could not load your organizations.",
          variant: "destructive",
        })
        return
      }

      interface TenantData {
        id: string;
        name: string;
        avatar_url: string | null;
      }

      interface TenantResponse {
        tenant_id: string;
        tenants: TenantData | null;
      }

      // First cast to unknown, then to our specific type
      const typedUserTenants = (userTenants as unknown) as TenantResponse[];
      const fetchedTenants = typedUserTenants
        .map(ut => ut.tenants)
        .filter((tenant): tenant is TenantData => tenant !== null)

      setTenants(fetchedTenants)
    }

    fetchTenants()
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

      toast({
        title: "Prompt created",
        description: "Your new email prompt has been created.",
      })
      setIsAddingPrompt(false)
      setSelectedExample(null)
      setNewPrompt({
        title: '',
        prompt: '',
        description: null,
        type: 'response',
        tenant_id: ''
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

  const addToLibrary = (example: {
    title: string;
    description: string;
    instructions: string;
    type: 'response' | 'rewrite';
  }) => {
    setSelectedExample(example)
    setNewPrompt({
      title: example.title,
      prompt: example.instructions,
      description: example.description,
      type: example.type,
      tenant_id: tenants[0]?.id || ''
    })
    setIsAddingPrompt(true)
  }

  const sendMessage = async () => {
    if (!userMessage.trim()) return

    const newMessage = { role: 'user' as const, content: userMessage }
    setChatHistory(prev => [...prev, newMessage])
    setUserMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, newMessage],
          systemMessage
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePrompt = (promptId: string) => {
    setExpandedPrompts(prev => ({
      ...prev,
      [promptId]: !prev[promptId]
    }))
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Mail className="w-6 h-6" />
              <h1 className="text-3xl font-bold">Email Assistant Help</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => window.location.href = '/email-assistant'}>
                <Mail className="w-4 h-4 mr-2" />
                Email Assistant
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/prompt-library'}>
                <Library className="w-4 h-4 mr-2" />
                Prompt Library
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">
              <Tabs defaultValue="overview">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="features">Features</TabsTrigger>
                  <TabsTrigger value="workflow">Workflow</TabsTrigger>
                  <TabsTrigger value="examples">Examples</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Email Assistant Overview</CardTitle>
                      <CardDescription>
                        A powerful tool for managing and automating email communications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <h3 className="text-lg font-semibold">What is the Email Assistant?</h3>
                      <p className="text-muted-foreground">
                        The Email Assistant is an AI-powered tool that helps you create, manage, and use email templates
                        and response patterns. It combines customizable prompts with AI to generate professional
                        and contextually appropriate emails.
                      </p>

                      <h3 className="text-lg font-semibold">Key Components</h3>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <p className="font-medium">Email Assistant</p>
                            <p className="text-sm text-muted-foreground">
                              Generate responses and rewrite emails using your organization's prompts
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Library className="w-5 h-5 mt-1 text-primary" />
                          <div>
                            <p className="font-medium">Prompt Library</p>
                            <p className="text-sm text-muted-foreground">
                              Manage and organize your email handling instructions and templates
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="features" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Features</CardTitle>
                      <CardDescription>
                        Explore the powerful features available in the Email Assistant
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Response Generation
                          </h3>
                          <p className="text-muted-foreground">
                            Generate contextually appropriate responses to incoming emails using customized prompts.
                            The AI follows your organization's guidelines while maintaining professionalism and clarity.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-primary" />
                            Email Rewriting
                          </h3>
                          <p className="text-muted-foreground">
                            Improve and polish existing emails to enhance clarity, professionalism, and effectiveness.
                            Perfect for drafts or when you need to refine your message.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-primary" />
                            AI-Assisted Prompt Creation
                          </h3>
                          <p className="text-muted-foreground">
                            Create effective email handling instructions using AI assistance. Simply describe
                            what you need, and the AI will help craft detailed prompts.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-primary" />
                            Refinement Tools
                          </h3>
                          <p className="text-muted-foreground">
                            Fine-tune generated emails with specific instructions, and refine prompts
                            with AI assistance to make them more effective.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="workflow" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>How to Use</CardTitle>
                      <CardDescription>
                        Step-by-step guide to using the Email Assistant effectively
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">1. Setting Up Prompts</h3>
                          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                            <li>Visit the Prompt Library</li>
                            <li>Click "Add Prompt" or "Add Prompt with AI"</li>
                            <li>Create instructions for handling specific email scenarios</li>
                            <li>Organize prompts by type (Response/Rewrite) and organization</li>
                          </ol>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-2">2. Generating Responses</h3>
                          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                            <li>Open the Email Assistant</li>
                            <li>Select your organization and response mode</li>
                            <li>Choose an appropriate prompt</li>
                            <li>Paste the email you're working with</li>
                            <li>Generate and refine the response as needed</li>
                          </ol>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-2">3. Rewriting Emails</h3>
                          <ol className="list-decimal list-inside space-y-2 text-muted-foreground ml-4">
                            <li>Switch to "Rewrite Email" mode</li>
                            <li>Paste the email you want to improve</li>
                            <li>Generate the rewritten version</li>
                            <li>Use refinement tools for additional adjustments</li>
                          </ol>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold mb-2">Best Practices</h3>
                          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                            <li>Create clear, specific prompts for different scenarios</li>
                            <li>Use AI assistance when creating complex prompts</li>
                            <li>Review and refine generated content before sending</li>
                            <li>Maintain consistent tone across your organization</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="examples" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Example Prompts</CardTitle>
                      <CardDescription>
                        Real-world examples of effective email prompts and their usage
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            Response Prompts
                          </h3>

                          <div className="space-y-6">
                            {[
                              {
                                title: "Initial Sales Inquiry Response",
                                description: "For responding to first-time product inquiries",
                                instructions: `Imagine you're responding to: "I found your product online and I'm interested in learning more about [Product Name]."

Create a welcoming response that:
��� Thanks them for their interest in our products
• Provides a brief overview of our company (We are [Company], specializing in...)
• Asks about their specific needs and use case
• Offers to schedule a demo or consultation
• Includes your contact information

Keep the tone friendly and professional, focusing on understanding their needs rather than immediate selling.`
                              },
                              {
                                title: "Meeting Request Response",
                                description: "For handling initial meeting requests",
                                instructions: `When someone emails: "Would love to schedule a meeting to discuss potential collaboration"

Respond with:
1. Express appreciation for their interest
2. Suggest 2-3 specific time slots (e.g., "Would Tuesday at 2pm or Wednesday at 10am work?")
3. Specify if it's virtual or in-person
4. Ask if they have any specific topics they'd like to cover
5. Include your time zone

Keep it brief and focused on setting up the initial meeting.`
                              },
                              {
                                title: "Product Information Request",
                                description: "For requesting specific product details from vendors",
                                instructions: `Use when reaching out: "We are [Company Name] and we're interested in your [Product/Service] offering.

Please provide:
• Detailed product specifications
• Pricing information for different tiers/volumes
• Available customization options
• Delivery timeframes
• Technical documentation if applicable

We appreciate your prompt response and look forward to learning more about your solutions."`
                              },
                              {
                                title: "Quote Request Response",
                                description: "For responding to pricing inquiries",
                                instructions: `When someone asks: "Can you provide pricing for your services?"

Structure your response to:
1. Thank them for their interest
2. Ask for key details needed for accurate pricing:
   - Project scope
   - Timeline requirements
   - Quantity/volume needed
   - Special requirements
3. Mention typical turnaround time for quotes
4. Provide any immediately available pricing ranges if applicable

End with a clear next step to gather the needed information.`
                              },
                              {
                                title: "Support Ticket Follow-up",
                                description: "For checking if an issue was resolved",
                                instructions: `After providing a solution, write: "I wanted to follow up regarding the [specific issue] you reported.

Could you please:
• Confirm if the solution resolved your issue
• Let us know if you're experiencing any other problems
• Share any feedback about the resolution process

We're here to help if you need any further assistance."`
                              }
                            ].map((example, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => togglePrompt(`response-${index}`)}
                                >
                                  <div>
                                    <h4 className="font-medium">{example.title}</h4>
                                    <p className="text-sm text-muted-foreground">{example.description}</p>
                                  </div>
                                  <Button variant="ghost" size="icon">
                                    <motion.div
                                      animate={{ rotate: expandedPrompts[`response-${index}`] ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </motion.div>
                                  </Button>
                                </div>
                                <AnimatePresence initial={false}>
                                  {expandedPrompts[`response-${index}`] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <div className="bg-muted p-3 rounded-md text-sm mt-3">
                                        <p className="font-medium mb-2">Instructions:</p>
                                        <p className="text-muted-foreground whitespace-pre-wrap">
                                          {example.instructions}
                                        </p>
                                        <div className="mt-4 pt-3 border-t">
                                          <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              addToLibrary({
                                                ...example,
                                                type: 'response'
                                              })
                                            }}
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add to Your Library
                                          </Button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <RefreshCw className="w-5 h-5 text-primary" />
                            Rewrite Prompts
                          </h3>

                          <div className="space-y-6">
                            {[
                              {
                                title: "Technical to Simple Language",
                                description: "For simplifying technical explanations",
                                instructions: `When you receive a technical explanation like: "Our system uses advanced ML algorithms for predictive analytics..."

Rewrite it to:
• Use everyday language
• Include practical examples
• Focus on benefits rather than technical details
• Avoid jargon and acronyms
• Add relevant comparisons

Example structure: "Our system learns from past data to help predict future trends, similar to how..."

Keep explanations clear and relatable to non-technical readers.`
                              },
                              {
                                title: "Urgent Request Clarification",
                                description: "For responding to urgent but vague requests",
                                instructions: `When receiving: "Need this ASAP!"

Respond professionally with:
"I understand this is urgent and I want to help. To proceed quickly, please:
• Specify exactly what you need
• When you need it by (exact date/time)
• Any specific format requirements
• Who else needs to be involved

I'll prioritize this once I have these details."`
                              },
                              {
                                title: "Professional Tone Adjustment",
                                description: "For making casual emails more professional",
                                instructions: `Transform casual messages like: "Hey! Just wondering if you guys got around to checking that thing I sent last week?"

Key adjustments:
• Use proper salutations
• Remove casual language
• Add specific references
• Maintain clarity
• Keep it concise

While being professional, preserve the original query's intent and urgency.`
                              },
                              {
                                title: "Feature Announcement",
                                description: "For announcing new product features",
                                instructions: `Start with: "We're excited to announce [Feature Name]!"

Then structure as:
1. One-sentence feature summary
2. Key benefit to the user
3. How to access/use it
4. Where to find more information
5. Call to action (try it now, learn more, etc.)

Keep it focused on user value rather than technical details.`
                              },
                              {
                                title: "Deadline Extension Request",
                                description: "For requesting more time professionally",
                                instructions: `When you need more time: "Regarding the [Project/Deliverable] due on [Date]..."

Include:
• Clear acknowledgment of original deadline
• Specific new date request
• Brief, honest reason for extension
• Impact mitigation plan
• Commitment to new deadline

Keep it professional and solution-focused, without over-explaining.`
                              }
                            ].map((example, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => togglePrompt(`rewrite-${index}`)}
                                >
                                  <div>
                                    <h4 className="font-medium">{example.title}</h4>
                                    <p className="text-sm text-muted-foreground">{example.description}</p>
                                  </div>
                                  <Button variant="ghost" size="icon">
                                    <motion.div
                                      animate={{ rotate: expandedPrompts[`rewrite-${index}`] ? 180 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </motion.div>
                                  </Button>
                                </div>
                                <AnimatePresence initial={false}>
                                  {expandedPrompts[`rewrite-${index}`] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <div className="bg-muted p-3 rounded-md text-sm mt-3">
                                        <p className="font-medium mb-2">Instructions:</p>
                                        <p className="text-muted-foreground whitespace-pre-wrap">
                                          {example.instructions}
                                        </p>
                                        <div className="mt-4 pt-3 border-t">
                                          <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              addToLibrary({
                                                ...example,
                                                type: 'rewrite'
                                              })
                                            }}
                                          >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add to Your Library
                                          </Button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium mb-2">Pro Tips</h4>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 mt-1 text-primary" />
                              Make prompts specific to your organization's communication style
                            </li>
                            <li className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 mt-1 text-primary" />
                              Include clear instructions for handling different scenarios
                            </li>
                            <li className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 mt-1 text-primary" />
                              Use AI assistance to refine prompts based on actual usage
                            </li>
                            <li className="flex items-start gap-2">
                              <Sparkles className="w-4 h-4 mt-1 text-primary" />
                              Regularly update prompts based on feedback and effectiveness
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="col-span-12 lg:col-span-5">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Ask for Help</CardTitle>
                  <CardDescription>
                    Chat with AI to get answers about using the Email Assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4 h-[400px] overflow-y-auto p-4 rounded-lg bg-muted">
                    {chatHistory.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                          }`}
                        >
                          {message.content}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask a question about the Email Assistant..."
                      value={userMessage}
                      onChange={(e) => setUserMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={isLoading || !userMessage.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isAddingPrompt} onOpenChange={(open) => {
        if (!open) {
          setIsAddingPrompt(false)
          setSelectedExample(null)
          setNewPrompt({
            title: '',
            prompt: '',
            description: null,
            type: 'response',
            tenant_id: ''
          })
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Example to Your Library</DialogTitle>
            <DialogDescription>
              Customize this example prompt for your organization.
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
              setSelectedExample(null)
              setNewPrompt({
                title: '',
                prompt: '',
                description: null,
                type: 'response',
                tenant_id: ''
              })
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddPrompt}>
              Add to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 