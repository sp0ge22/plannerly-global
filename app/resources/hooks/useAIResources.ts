import { useState } from 'react'
import { useToast } from "@/hooks/use-toast"
import { AIResourceSuggestion } from '../types'

export function useAIResources() {
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiResourceSuggestion, setAiResourceSuggestion] = useState<AIResourceSuggestion | null>(null)
  const { toast } = useToast()

  const getAISuggestion = async (companyName: string) => {
    setIsLoadingAI(true)
    try {
      const response = await fetch('/api/resources/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName }),
      })

      if (!response.ok) throw new Error('Failed to get AI suggestion')

      const suggestion = await response.json()
      setAiResourceSuggestion(suggestion)
      return suggestion
    } catch (error) {
      console.error('Error getting AI suggestion:', error)
      toast({
        title: "Failed to get AI suggestion",
        description: "There was an error analyzing the resource. Please try again.",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsLoadingAI(false)
    }
  }

  return {
    isLoadingAI,
    aiResourceSuggestion,
    setAiResourceSuggestion,
    getAISuggestion
  }
} 