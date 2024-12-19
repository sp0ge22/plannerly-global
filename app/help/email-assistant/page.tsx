'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Library, MessageSquare, RefreshCw, Sparkles, Wand2, Plus, X } from 'lucide-react'
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

const systemMessage = `I am an AI assistant specializing in email communication and prompt engineering. I can help you:

1. Create Effective Prompts:
   - Design prompts for different email scenarios (support, sales, inquiries)
   - Structure prompts for consistent responses
   - Balance specificity with flexibility
   - Include necessary context and requirements

2. Understand Prompt Types:
   - Response Generation: For creating new email replies
   - Email Rewriting: For improving existing messages
   - Custom Scenarios: For specific business needs

3. Best Practices:
   - Keep prompts clear and focused
   - Include required information fields
   - Maintain brand voice and tone
   - Handle variations within scenarios

4. Advanced Features:
   - Using AI-assisted prompt creation
   - Refining prompts for better results
   - Managing prompt libraries
   - Testing and iterating prompts

Feel free to ask about any of these topics or specific email scenarios!`

export default function EmailAssistantHelpPage() {
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
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const { toast } = useToast()

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

          <div className="grid grid-cols-1">
            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
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
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">What is the Email Assistant?</h3>
                      <p className="text-muted-foreground">
                        The Email Assistant is an AI-powered tool that helps you create, manage, and use email templates
                        and response patterns. It combines customizable prompts with AI to generate professional
                        and contextually appropriate emails.
                      </p>

                      <div className="grid gap-6 mt-6">
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
                      </div>

                      <div className="bg-muted p-4 rounded-lg mt-6">
                        <h4 className="font-medium mb-2">Key Components</h4>
                        <div className="space-y-4">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workflow" className="space-y-4">
                <Tabs defaultValue="response" className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="response" className="flex-1">
                      <div className="flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Generate Response</span>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger value="rewrite" className="flex-1">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        <span>Rewrite Email</span>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="response">
                    <Card>
                      <CardHeader>
                        <CardTitle>How to Use Response Generation</CardTitle>
                        <CardDescription>
                          Learn how to create and use email response prompts effectively
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                            <div className="text-center max-w-2xl mx-auto">
                              <h3 className="text-xl font-semibold">Do you handle repetitive email scenarios?</h3>
                              <p className="text-muted-foreground mt-2">
                                Save time and maintain consistency by automating your common email patterns
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mt-6">
                              {[
                                { id: 'warranty', title: 'Warranty Claims', icon: MessageSquare },
                                { id: 'support', title: 'Support Tickets', icon: RefreshCw },
                                { id: 'quote', title: 'Quote Requests', icon: Mail },
                                { id: 'product', title: 'Product Information', icon: Sparkles }
                              ].map((scenario) => (
                                <div
                                  key={scenario.id}
                                  className={`bg-background/50 p-4 rounded-lg border shadow-sm cursor-pointer transition-all hover:shadow-md ${
                                    selectedScenario === scenario.id ? 'ring-2 ring-primary' : ''
                                  }`}
                                  onClick={() => setSelectedScenario(scenario.id === selectedScenario ? null : scenario.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary/10">
                                      <scenario.icon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h4 className="font-medium">{scenario.title}</h4>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <AnimatePresence mode="wait">
                              {selectedScenario && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="border rounded-lg p-6 space-y-6 bg-background mt-6">
                                    <div className="flex items-center justify-between">
                                      <h3 className="text-lg font-semibold">
                                        Creating a {
                                          selectedScenario === 'warranty' ? 'Warranty Claims' :
                                          selectedScenario === 'support' ? 'Support Tickets' :
                                          selectedScenario === 'quote' ? 'Quote Requests' :
                                          'Product Information'
                                        } Prompt
                                      </h3>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedScenario(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>

                                    <div className="space-y-4">
                                      {(() => {
                                        const steps = selectedScenario === 'warranty' ? [
                                          {
                                            title: "Create Your Prompt",
                                            description: "Click the + Add Prompt button in either Email Assistant or Prompt Library. Choose between 'Add Prompt with AI' (recommended) or 'Create it manually'."
                                          },
                                          {
                                            title: "Think About What You Need",
                                            description: "When someone has a warranty issue, they're usually frustrated and want a quick solution. You'll need photos of the problem, their proof of purchase, and a shipping address for returns. Getting these details right away helps you process their claim faster and shows them you're taking their issue seriously."
                                          },
                                          {
                                            title: "Tell AI What You Want",
                                            description: "Tell the AI to create a warranty response that asks for photos of the damaged product, proof of purchase, and shipping address. Say you want to be empathetic while explaining why we need these details. Ask it to include our typical processing time (1-2 business days) and mention expedited shipping for urgent cases. Keep the tone professional but understanding."
                                          },
                                          {
                                            title: "Review AI-Generated Prompt",
                                            description: `The AI might generate something like:
                                            Title: Warranty Claim Documentation Request
                                            Instructions: Begin with empathy about their issue. Request:
                                            1. Clear photos of the problem
                                            2. Proof of purchase/receipt
                                            3. Complete shipping address
                                            Explain next steps and typical processing time.`
                                          },
                                          {
                                            title: "Use Your Prompt",
                                            description: "Great! Now open Email Assistant, select your organization and the warranty prompt you just created."
                                          },
                                          {
                                            title: "Handle Customer Email",
                                            description: `Example incoming email:
                                            "Hi, my product is showing signs of damage after just 2 weeks. The handle is loose and I'm worried it might break. Can you help?"`
                                          },
                                          {
                                            title: "Generate & Refine Response",
                                            description: `1. Click Generate Response
                                            2. Review the response
                                            3. Refine with extra context like "Add that we offer express shipping for urgent cases"
                                            4. Copy final response to clipboard`
                                          },
                                          {
                                            title: "Review Generated Response",
                                            description: `Here's how your response might look:

                                            "Hi! I'm sorry to hear you're having issues with your product after just two weeks. I understand this is frustrating, and I'm here to help get this resolved for you.

                                            To process your warranty claim quickly, I'll need a few things from you:
                                            1. Could you please send some clear photos showing the loose handle?
                                            2. Your proof of purchase or order number
                                            3. Your complete shipping address for the return

                                            Once we have these details, we typically process warranty claims within 1-2 business days. For cases like yours where the product is nearly new, we can expedite the shipping of your replacement.

                                            In the meantime, please avoid using the product if you feel it might be unsafe. We want to make sure you get a properly functioning replacement as soon as possible.

                                            Best regards,
                                            [Your name]"`
                                          }
                                        ] : selectedScenario === 'support' ? [
                                          {
                                            title: "Create Your Prompt",
                                            description: "Click the + Add Prompt button in either Email Assistant or Prompt Library. Choose between 'Add Prompt with AI' (recommended) or 'Create it manually'."
                                          },
                                          {
                                            title: "Think About What You Need",
                                            description: "When someone has a tech problem, they're usually frustrated and just want help. You'll need to know what happened, what they were doing at the time, and what error messages they saw. Getting these details right away helps you solve their problem faster and shows them you care about fixing it."
                                          },
                                          {
                                            title: "Tell AI What You Want",
                                            description: "Just tell the AI you need help with tech support emails. Say you want to be friendly while getting the right information to help them. Mention that you want to give them clear next steps and let them know how long things might take. Keep it simple and natural."
                                          },
                                          {
                                            title: "Review AI-Generated Prompt",
                                            description: `The AI might generate something like:
                                            Title: Technical Support Response Template
                                            Instructions:
                                            1. Start with understanding acknowledgment
                                            2. Request specific details:
                                               • Error messages/screenshots
                                               • Steps to reproduce
                                               • System information
                                            3. Outline support process and timeline
                                            4. Provide immediate workaround if available`
                                          },
                                          {
                                            title: "Use Your Prompt",
                                            description: "Open Email Assistant, select your organization and the support prompt. This will help maintain consistent, thorough support responses."
                                          },
                                          {
                                            title: "Handle Support Request",
                                            description: `Example support request:
                                            "Hi there! I've been trying to access my admin dashboard for the past hour but keep getting a 'Connection Error' message. I've already cleared my cache and tried different browsers, but nothing seems to work. This is pretty urgent as I need to update our company's pricing before a big launch tomorrow morning. I've attached a screenshot of the error. Any help would be greatly appreciated!

                                            Thanks,
                                            Michael
                                            Head of Marketing, CloudTech"`
                                          },
                                          {
                                            title: "Generate & Customize Response",
                                            description: `1. Click Generate Response
                                            2. Review automated response
                                            3. Add specific troubleshooting steps
                                            4. Include links to relevant help articles
                                            5. Mention alternative contact methods for urgent cases`
                                          },
                                          {
                                            title: "Review Generated Response",
                                            description: `Here's how your response might look:

                                            "Hi Michael! I understand this is urgent with your launch tomorrow, and I'm here to help you regain access to your admin dashboard right away.

                                            I can see you've already tried clearing your cache and using different browsers - that's great troubleshooting. Based on the error message you're seeing, this might be related to recent security updates. Let me help you with some immediate solutions.

                                            First, try accessing the dashboard through our backup admin URL: admin.cloudtech.com/backup. If that works, you can proceed with your pricing updates while we fix the main portal. If not, I can temporarily enable emergency access mode for your account, which bypasses some of our regular security checks.

                                            Given the urgency, I've also escalated this to our senior technical team. They can assist you directly if needed - I'll have them contact you within the next 30 minutes.

                                            Would you like me to enable the emergency access mode now? Just reply with 'Yes' and I'll set it up immediately.

                                            Best regards,
                                            [Your name]"`
                                          }
                                        ] : selectedScenario === 'quote' ? [
                                          {
                                            title: "Create Your Prompt",
                                            description: "Click the + Add Prompt button in either Email Assistant or Prompt Library. Choose between 'Add Prompt with AI' (recommended) or 'Create it manually'."
                                          },
                                          {
                                            title: "Think About What You Need",
                                            description: "When someone asks for a quote, they're excited about working with you but need to know the costs. You'll want to find out exactly what they're looking to buy, how many they need, and when they need it by. This helps you give them an accurate price and shows you're taking their request seriously."
                                          },
                                          {
                                            title: "Tell AI What You Want",
                                            description: "Tell the AI you want to explain your design prices clearly. Say something like 'I charge $50 for logos, $100 for banners, and $75 per hour for custom work. I want to be friendly but clear about the costs. Let them know that complex designs might take longer and cost more. Also mention that I offer package deals like $200 for a logo with matching business cards and letterhead.'"
                                          },
                                          {
                                            title: "Review AI-Generated Prompt",
                                            description: `The AI might generate something like:
                                            Title: Graphic Design Quote Template
                                            Instructions:
                                            1. Thank them warmly for their interest
                                            2. Share our standard pricing:
                                               • Logo Design: $50
                                               • Banner Design: $100
                                               • Custom Work: $75/hour
                                               • Logo Package: $200 (includes business cards & letterhead)
                                            3. Mention that complex designs may need extra time
                                            4. Ask about their timeline and specific requirements
                                            5. Highlight any current package deals
                                            
                                            Remember to be friendly but clear about pricing and timelines.`
                                          },
                                          {
                                            title: "Use Your Prompt",
                                            description: "Open Email Assistant, select your organization and the quote request prompt. This ensures consistent and thorough quote processes."
                                          },
                                          {
                                            title: "Handle Quote Request",
                                            description: `Example quote request:
                                            "Hi there! I came across your design work on Instagram and it really caught my eye. I'm starting a small business and need some help with branding. I'd love to get a logo designed, plus some business cards for my team of 5. We also need a banner for our website and maybe some social media templates to keep everything looking consistent. I'm flexible on the budget but would like to get an idea of your rates. We're hoping to launch in about a month, so it would be great if we could get this done by then. Thanks for your time!

                                            Best,
                                            Sarah
                                            TechFlow Solutions"`
                                          },
                                          {
                                            title: "Generate & Enhance Response",
                                            description: `1. Click Generate Response
                                            2. Review automated response
                                            3. Add specific pricing tiers if available
                                            4. Include relevant case studies or examples
                                            5. Mention any current promotions or volume discounts`
                                          },
                                          {
                                            title: "Review Generated Response",
                                            description: `Here's how your response might look:

                                            "Hi Sarah! Thanks for reaching out about your branding project - I'm excited to help bring your vision to life. Let me break down the costs for you so everything is clear.

                                            For the logo design, I charge $50 which includes three initial concepts and two rounds of revisions to make sure we get it exactly right. The business cards for your team would be $100, and I'll make sure they perfectly match your new branding. The website banner would be $100, and I can create it in multiple sizes if needed. For the social media templates, that would be $150, and I'll set them up so they're easy for you to edit and use later.

                                            Since you're looking for the complete package, I can offer you a special deal: $350 for everything (that's a $50 savings), and I'll even throw in a letterhead design at no extra cost. Your one-month timeline works perfectly with my schedule.

                                            Would you like to hop on a quick call this week to discuss your vision in more detail? I'd love to hear more about your brand and make sure we create something that really stands out.

                                            Best regards,
                                            [Your name]"`
                                          }
                                        ] : [
                                          {
                                            title: "Create Your Prompt",
                                            description: "Click the + Add Prompt button in either Email Assistant or Prompt Library. Choose between 'Add Prompt with AI' (recommended) or 'Create it manually'."
                                          },
                                          {
                                            title: "Think About What You Need",
                                            description: "When someone asks about your product, they want to know how it can help them, not just a list of features. You'll want to explain what your product does in simple terms, how it makes their life easier, and why they should choose it. Focus on the benefits that matter most to your customers."
                                          },
                                          {
                                            title: "Tell AI What You Want",
                                            description: "Tell the AI you need help explaining your products in a clear and simple way. Say you want to cover the main features while keeping things easy to understand. Mention that you want to answer the questions customers usually have about your product."
                                          },
                                          {
                                            title: "Review AI-Generated Prompt",
                                            description: `The AI might generate something like:
                                            Title: Product Information Response Template
                                            Instructions:
                                            1. Thank them for their interest
                                            2. Address specific product aspects:
                                               • Key features and benefits
                                               • Technical specifications
                                               • Use cases and applications
                                            3. Include relevant resources
                                            4. Offer additional assistance`
                                          },
                                          {
                                            title: "Use Your Prompt",
                                            description: "Open Email Assistant, select your organization and the product information prompt. This ensures detailed and consistent product communications."
                                          },
                                          {
                                            title: "Handle Product Inquiry",
                                            description: `Example product inquiry:
                                            "Hello! I'm researching project management tools for our marketing agency (about 50 people). Your platform caught my attention, but I have some specific questions. We handle a lot of client deadlines and need strong collaboration features. Also curious about your security certifications since we work with some financial clients. Could you tell me more about these aspects? Also wondering about your pricing for teams.

                                            Best regards,
                                            Rachel
                                            Operations Director, CreativeFlow Agency"`
                                          },
                                          {
                                            title: "Generate & Customize Response",
                                            description: `1. Click Generate Response
                                            2. Review automated response
                                            3. Add product-specific details and documentation
                                            4. Include relevant case studies or white papers
                                            5. Offer a product demo or consultation`
                                          },
                                          {
                                            title: "Review Generated Response",
                                            description: `Here's how your response might look:

                                            "Hi Rachel! Thank you for your interest in our project management platform. I'd love to show you how we can help CreativeFlow Agency streamline your client work and team collaboration.

                                            For marketing agencies like yours, our platform offers real-time collaboration boards, automated deadline tracking, and client-specific workspaces. Many of our agency clients particularly love our timeline visualization feature, which helps prevent deadline conflicts across multiple clients.

                                            Regarding security, we maintain SOC 2 Type II and ISO 27001 certifications, making us fully compliant for financial sector work. We also offer private cloud deployment for additional security if needed.

                                            For your team size, our Professional Plan would be perfect: $15 per user/month with annual billing, including unlimited clients and projects. I can also offer you a 20% discount for the first year as you're bringing 50+ users.

                                            Would you be interested in a personalized demo this week? I can show you specifically how other marketing agencies are using our platform to manage their client workflows.

                                            Best regards,
                                            [Your name]"`
                                          }
                                        ];

                                        return steps.map((step, index) => (
                                          <motion.div
                                            key={index}
                                            initial={{ x: -20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{
                                              duration: 0.3,
                                              delay: index * 0.15,
                                              ease: "easeOut"
                                            }}
                                            className="flex items-start gap-4"
                                          >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                              <span className="font-semibold">{index + 1}</span>
                                            </div>
                                            <div>
                                              <h4 className="font-medium">{step.title}</h4>
                                              <div className="text-sm text-muted-foreground mt-1 space-y-2">
                                                {step.description.includes('\n') ? (
                                                  step.description.split('\n').map((line, i) => (
                                                    <p key={i} className="whitespace-pre-wrap">{line.trim()}</p>
                                                  ))
                                                ) : (
                                                  <p>{step.description}</p>
                                                )}
                                              </div>
                                            </div>
                                          </motion.div>
                                        ));
                                      })()}
                                    </div>

                                    <motion.div
                                      initial={{ y: 20, opacity: 0 }}
                                      animate={{ y: 0, opacity: 1 }}
                                      transition={{
                                        duration: 0.3,
                                        delay: 0.45,
                                        ease: "easeOut"
                                      }}
                                      className="mt-6 pt-6 border-t"
                                    >
                                      <Button 
                                        className="w-full"
                                        onClick={() => window.location.href = `/email-assistant?action=create-prompt&type=ai&scenario=${selectedScenario}`}
                                      >
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Try It Now
                                      </Button>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Pro Tips for Response Generation</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Start with AI-generated prompts and refine them based on your specific needs
                              </li>
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Create different prompts for various scenarios within the same category
                              </li>
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Use the refinement feature to add specific details or adjust tone
                              </li>
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Save successful prompts to your library for future use
                              </li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="rewrite">
                    <Card>
                      <CardHeader>
                        <CardTitle>How to Use Email Rewriting</CardTitle>
                        <CardDescription>
                          Learn how to improve and refine existing emails
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-6">
                          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                            <h3 className="text-lg font-semibold">Need to improve existing emails?</h3>
                            <p className="text-muted-foreground">
                              The rewrite feature helps you enhance emails by:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                              <li>Improving clarity and professionalism</li>
                              <li>Adjusting tone and formality</li>
                              <li>Making complex messages more accessible</li>
                              <li>Ensuring consistent brand voice</li>
                            </ul>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold">How to Rewrite Emails</h3>
                            
                            <div className="border rounded-lg p-4 space-y-3">
                              <h4 className="font-medium">Step 1: Paste Your Email</h4>
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <p className="text-muted-foreground">
                                  Simply paste the email you want to improve into the input field.
                                  No prompt selection is needed for rewrites.
                                </p>
                              </div>
                            </div>

                            <div className="border rounded-lg p-4 space-y-3">
                              <h4 className="font-medium">Step 2: Generate Rewrite</h4>
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <p className="text-muted-foreground">
                                  Click "Rewrite Email" to get an improved version that maintains
                                  your message while enhancing clarity and professionalism.
                                </p>
                              </div>
                            </div>

                            <div className="border rounded-lg p-4 space-y-3">
                              <h4 className="font-medium">Step 3: Refine if Needed</h4>
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <p className="text-muted-foreground">
                                  Use the refinement feature to make specific adjustments:
                                </p>
                                <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
                                  <li>Make it more concise</li>
                                  <li>Adjust the tone</li>
                                  <li>Add or emphasize specific points</li>
                                  <li>Modify the structure</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="bg-muted p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Pro Tips for Rewriting</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Start with the basic rewrite and then use refinements for specific adjustments
                              </li>
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Be specific in refinement instructions (e.g., "make it more empathetic")
                              </li>
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Use multiple refinement steps for complex changes
                              </li>
                              <li className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 mt-1 text-primary" />
                                Review the final version to ensure it maintains your intended message
                              </li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
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
                              title: "General Warranty Response",
                              description: "For responding to warranty inquiries",
                              instructions: `• Begin with a sincere apology for any inconvenience
• Use warm and empathetic tone throughout
• Request the following warranty information:
  - Proof of purchase
  - Clear photographs of the item
  - Product details and issue description
 Explain how these details help expedite the process
• Avoid technical jargon
• End with commitment to assist and appreciation

Keep language clear and simple while maintaining a supportive tone.`
                            },
                            {
                              title: "Meeting Request Response",
                              description: "For handling initial meeting requests",
                              instructions: `1. Express appreciation for their interest
2. Suggest 2-3 specific time slots (e.g., "Would Tuesday at 2pm or Wednesday at 10am work?")
3. Specify if it's virtual or in-person
4. Ask if they have any specific topics they'd like to cover
5. Include your time zone

Keep it brief and focused on setting up the initial meeting.`
                            },
                            {
                              title: "Product Information Request",
                              description: "For requesting specific product details from vendors",
                              instructions: `Please provide:
• Detailed product specifications
• Pricing information for different tiers/volumes
• Available customization options
• Delivery timeframes
• Technical documentation if applicable

We appreciate your prompt response and look forward to learning more about your solutions.`
                            },
                            {
                              title: "Quote Request Response",
                              description: "For responding to pricing inquiries",
                              instructions: `1. Thank them for their interest
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
                              instructions: `Could you please:
• Confirm if the solution resolved your issue
• Let us know if you're experiencing any other problems
• Share any feedback about the resolution process

We're here to help if you need any further assistance.`
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
                              instructions: `• Use everyday language
• Include practical examples
• Focus on benefits rather than technical details
• Avoid jargon and acronyms
• Add relevant comparisons

Keep explanations clear and relatable to non-technical readers.`
                            },
                            {
                              title: "Urgent Request Clarification",
                              description: "For responding to urgent but vague requests",
                              instructions: `"I understand this is urgent and I want to help. To proceed quickly, please:
• Specify exactly what you need
• When you need it by (exact date/time)
• Any specific format requirements
• Who else needs to be involved

I'll prioritize this once I have these details."`
                            },
                            {
                              title: "Professional Tone Adjustment",
                              description: "For making casual emails more professional",
                              instructions: `Key adjustments:
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
                              instructions: `1. One-sentence feature summary
2. Key benefit to the user
3. How to access/use it
4. Where to find more information
5. Call to action (try it now, learn more, etc.)

Keep it focused on user value rather than technical details.`
                            },
                            {
                              title: "Deadline Extension Request",
                              description: "For requesting more time professionally",
                              instructions: `Include:
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