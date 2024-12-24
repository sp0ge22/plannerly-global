import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface VerifyProps {
  email: string
  setMode: (mode: 'login' | 'signup' | 'verify') => void
}

export function Verify({ email, setMode }: VerifyProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // Listen for verification complete message
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'verification-complete') {
        // Close this tab since verification is complete
        window.close()
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  useEffect(() => {
    const checkVerification = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsVerified(true)
        // Redirect to tasks after a short delay
        setTimeout(() => {
          router.push('/tasks')
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

  if (isVerified) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
          <h2 className="text-2xl font-bold">Email Verified!</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your email has been verified successfully. Redirecting you to the app...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          We sent you a verification link to {email}. Click the link in your email to verify your account.
        </p>
        <p className="text-sm text-muted-foreground">
          This tab will automatically close once you verify your email in the new tab.
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