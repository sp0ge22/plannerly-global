import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface VerifyProps {
  email: string
  setMode: (mode: 'login' | 'signup' | 'verify') => void
}

export function Verify({ email, setMode }: VerifyProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        // If we have a session, the user is verified
        router.push('/tasks')
        // Close this tab after a short delay
        setTimeout(() => {
          window.close()
        }, 2000)
      }
    }

    // Check immediately
    checkVerification()

    // Then check every 2 seconds
    const interval = setInterval(checkVerification, 2000)

    // Cleanup interval on unmount
    return () => clearInterval(interval)
  }, [router, supabase.auth])

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          We sent you a verification link to {email}. Click the link in your email to verify your account.
        </p>
        <p className="text-sm text-muted-foreground">
          This page will automatically close once you're verified.
        </p>
        <Button 
          variant="ghost" 
          className="mt-4"
          onClick={() => setMode('login')}
        >
          Back to login
        </Button>
      </CardContent>
    </Card>
  )
} 