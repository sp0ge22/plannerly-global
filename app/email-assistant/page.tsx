'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Wand2, RefreshCw, MessageSquare } from 'lucide-react'
import { Input } from "@/components/ui/input"

type EmailType = 'new-customer' | 'warranty' | 'general'
type RewriteStyle = 'professional' | 'casual' | 'concise' | 'detailed' | 'custom'

export default function EmailAssistantPage() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [refinementText, setRefinementText] = useState('')
  const [emailType, setEmailType] = useState<EmailType>('general')
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>('professional')
  const [customPrompt, setCustomPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [mode, setMode] = useState<'respond' | 'rewrite'>('respond')
  const { toast } = useToast()

  const responsePrompts = {
    'new-customer': "You are responding as Freestyle Distribution, the North American distributor of Root Industries scooters. Write a professional and welcoming email response to this customer inquiry. Be friendly yet professional. Only write the body of the email, no greeting or signature. Here's the email to respond to:",
    'warranty': "You are responding as Freestyle Distribution, the North American distributor of Root Industries scooters. Write a professional email response regarding this warranty claim. Be helpful and understanding while explaining the warranty process. Only write the body of the email, no greeting or signature. Here's the email to respond to:",
    'general': "You are responding as Freestyle Distribution, the North American distributor of Root Industries scooters. Write a professional email response. Only write the body of the email, no greeting or signature. Here's the email to respond to:"
  }

  const rewritePrompts = {
    'professional': "Rewrite this email to sound more professional and polished while maintaining the core message. Improve clarity and formal tone. Do not include subject line or signature - only provide the body text:",
    'casual': "Clean up and improve this email while keeping a casual, friendly tone. Fix any errors and make it flow better. Do not include subject line or signature - only provide the body text:",
    'concise': "Rewrite this email to be more concise and to-the-point while maintaining professionalism. Remove unnecessary words and streamline the message. Do not include subject line or signature - only provide the body text:",
    'detailed': "Enhance this email with more detailed information and thorough explanations while maintaining professionalism. Expand on key points. Do not include subject line or signature - only provide the body text:",
    'custom': "" // Will be replaced by customPrompt
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

    setIsGenerating(true)
    try {
      const response = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText,
          prompt: mode === 'respond' 
            ? responsePrompts[emailType]
            : rewriteStyle === 'custom' 
              ? customPrompt 
              : rewritePrompts[rewriteStyle]
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
          prompt: mode === 'respond'
            ? "You are responding as Freestyle Distribution, the North American distributor of Root Industries scooters. Rewrite this email with the requested changes. Only provide the new body text, no greeting or signature."
            : "Rewrite this email with the requested changes while maintaining appropriate tone and clarity."
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

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-2">
            <Mail className="w-6 h-6" />
            <h1 className="text-3xl font-bold">Email Assistant</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Email Assistant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button
                  variant={mode === 'respond' ? 'default' : 'outline'}
                  onClick={() => setMode('respond')}
                  className="flex-1"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Generate Response
                </Button>
                <Button
                  variant={mode === 'rewrite' ? 'default' : 'outline'}
                  onClick={() => setMode('rewrite')}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rewrite Email
                </Button>
              </div>

              {mode === 'respond' ? (
                <div className="space-y-2">
                  <Label>Response Type</Label>
                  <Select
                    value={emailType}
                    onValueChange={(value: EmailType) => setEmailType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select response type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Response</SelectItem>
                      <SelectItem value="new-customer">New Customer Response</SelectItem>
                      <SelectItem value="warranty">Warranty Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Rewrite Style</Label>
                  <Select
                    value={rewriteStyle}
                    onValueChange={(value: RewriteStyle) => setRewriteStyle(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rewrite style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">More Professional</SelectItem>
                      <SelectItem value="casual">Casual Clean Up</SelectItem>
                      <SelectItem value="concise">More Concise</SelectItem>
                      <SelectItem value="detailed">More Detailed</SelectItem>
                      <SelectItem value="custom">Custom Prompt</SelectItem>
                    </SelectContent>
                  </Select>

                  {rewriteStyle === 'custom' && (
                    <div className="space-y-2">
                      <Label>Custom Rewrite Instructions</Label>
                      <Input
                        placeholder="Enter custom instructions for rewriting..."
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>{mode === 'respond' ? 'Original Email' : 'Email to Rewrite'}</Label>
                <Textarea
                  placeholder={mode === 'respond' 
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
                disabled={isGenerating || !inputText.trim() || (mode === 'rewrite' && rewriteStyle === 'custom' && !customPrompt.trim())}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === 'respond' ? 'Generating Response...' : 'Rewriting...'}
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {mode === 'respond' ? 'Generate Response' : 'Rewrite Email'}
                  </>
                )}
              </Button>

              {outputText && (
                <>
                  <div className="space-y-2">
                    <Label>{mode === 'respond' ? 'Generated Response' : 'Rewritten Email'}</Label>
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
    </div>
  )
} 