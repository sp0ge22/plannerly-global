import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, CheckCircle } from 'lucide-react'
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
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'verification-complete') {
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
        setTimeout(() => {
          router.push('/settings')
        }, 2000)
      }
    }

    checkVerification()
    const interval = setInterval(checkVerification, 2000)
    return () => clearInterval(interval)
  }, [router, supabase.auth])

  if (isVerified) {
    return (
      <Card className="w-full max-w-md shadow-lg transition-all duration-300">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 rounded-full scale-150 opacity-20" />
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 relative z-10" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">Email Verified!</h2>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Your email has been verified successfully. Redirecting you to the app...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md shadow-lg transition-all duration-300 pt-1">
      <CardContent className="pt-6 text-center space-y-6">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-full scale-150 opacity-20" />
          
          {/* Outer rotating ring */}
          <div className="absolute w-16 h-16 border-4 border-green-200 rounded-full animate-spin border-t-green-500" />
          
          {/* Inner rotating ring */}
          <div className="absolute w-12 h-12 border-4 border-green-100 rounded-full animate-spin border-b-green-400" 
               style={{ animationDirection: 'reverse', animationDuration: '3s' }} />
          
          {/* Mail icon */}
          <Mail className="h-8 w-8 text-green-600 relative z-10" />
          
          {/* Pulsing background */}
          <div className="absolute w-20 h-20 rounded-full animate-pulse opacity-30" />
        </div>

        <h2 className="text-2xl font-bold text-black">Check your email</h2>
        <div className="space-y-3">
          <p className="text-muted-foreground max-w-sm mx-auto">
            We sent you a verification link to{' '}
            <span className="font-medium text-green-600">{email}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Click the link in your email to verify your account.
          </p>
        </div>
        <div className="pt-2">
          <Button 
            variant="default" 
            className="bg-black hover:bg-black/90 text-white"
            onClick={() => setMode('login')}
          >
            Back to login
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}