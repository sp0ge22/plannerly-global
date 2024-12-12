import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from 'lucide-react'

interface VerifyProps {
  email: string
  setMode: (mode: 'login' | 'signup' | 'verify') => void
}

export function Verify({ email, setMode }: VerifyProps) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6 text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          We sent you a verification link to {email}. Click the link in your email to verify your account.
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