import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/ui/icons"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthError } from '@supabase/supabase-js'

interface LoginProps {
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  setMode: (mode: 'login' | 'signup' | 'verify') => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
}

export function Login({
  email,
  setEmail,
  password,
  setPassword,
  setMode,
  isLoading,
  setIsLoading
}: LoginProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        const { data: invite } = await supabase
          .from('invites')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (invite && !invite.used) {
          setMode('signup')
          toast({
            title: "Pending Invite",
            description: "You have a pending invite. Please complete your signup.",
          })
          return;
        }

        throw error;
      }

      router.push('/home')
    } catch (error: unknown) {
      const authError = error as AuthError
      toast({
        title: "Authentication failed",
        description: authError.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2">
          <Icons.logo className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold">Plannerly</CardTitle>
        </div>
        <p className="text-sm text-center text-muted-foreground">
          Sign in to your Plannerly account
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleLogin}>
          <div className="grid gap-2">
            <Input
              id="email"
              placeholder="name@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              required
            />
            <Input
              id="password"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Need an account?
            </span>
          </div>
        </div>
        <Button className="w-full" variant="outline" onClick={() => setMode('signup')}>
          Sign up
        </Button>
      </CardFooter>
    </Card>
  )
} 