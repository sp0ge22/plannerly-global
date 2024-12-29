import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/ui/icons"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2 } from 'lucide-react'

interface SignUpProps {
  email: string
  setEmail: (email: string) => void
  password: string
  setPassword: (password: string) => void
  confirmPassword: string
  setConfirmPassword: (confirmPassword: string) => void
  name: string
  setName: (name: string) => void
  organizationName: string
  setOrganizationName: (organizationName: string) => void
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  setMode: (mode: 'login' | 'signup' | 'verify') => void
  setShowTerms: (show: boolean) => void
  setShowPrivacyPolicy: (show: boolean) => void
}

export function SignUp({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  name,
  setName,
  organizationName,
  setOrganizationName,
  isLoading,
  setIsLoading,
  setMode,
  setShowTerms,
  setShowPrivacyPolicy
}: SignUpProps) {
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (password !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // Sign up the user
      const redirectUrl = `${window.location.origin}/auth/callback?redirect=verify`
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name,
            organization_name: organizationName,
          }
        }
      })

      if (signUpError) {
        // Handle specific email sending error
        if (signUpError.message === 'Error sending confirmation email') {
          throw new Error('Unable to send confirmation email. Please try again later or contact support.')
        }
        throw signUpError
      }

      if (!authData.user) {
        throw new Error('Signup failed - no user data returned')
      }

      // Create profile after successful signup
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: email.toLowerCase(),
          name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (profileError) throw profileError

      // Create a tenant for the new user
      const tenantName = organizationName?.trim() || `${email.toLowerCase()}'s Organization`
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{ name: tenantName }])
        .select('id')
        .single()

      if (tenantError) throw tenantError
      if (!tenantData?.id) throw new Error('Tenant creation returned no ID')

      // Link user to tenant as owner
      const { error: userTenantError } = await supabase
        .from('user_tenants')
        .insert([{
          user_id: authData.user.id,
          tenant_id: tenantData.id,
          is_owner: true
        }])

      if (userTenantError) throw userTenantError

      setMode('verify')
      
      toast({
        title: "Account created",
        description: "Please check your email to confirm your account. If you don't receive an email within a few minutes, please check your spam folder.",
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      console.error('Signup error:', error)
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
          Create your Plannerly account to start managing tasks and resources
        </p>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSignUp}>
          <div className="grid gap-2">
            <Input
              id="name"
              placeholder="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoCapitalize="words"
              autoComplete="name"
              autoCorrect="off"
              required
            />
            <Input
              id="organizationName"
              placeholder="Organization Name"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              autoCapitalize="words"
              autoCorrect="off"
              required
            />
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
              placeholder="Password (min. 8 characters)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <Input
              id="confirmPassword"
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : 'Create Account'}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2 text-center text-sm text-muted-foreground">
          <p>
            By creating an account, you agree to our{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-primary"
              onClick={() => setShowTerms(true)}
            >
              Terms of Service
            </Button>{" "}
            and{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-primary"
              onClick={() => setShowPrivacyPolicy(true)}
            >
              Privacy Policy
            </Button>
            .
          </p>
        </div>
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Already registered?
            </span>
          </div>
        </div>
        <Button className="w-full" variant="outline" onClick={() => setMode('login')}>
          Log In
        </Button>
      </CardFooter>
    </Card>
  )
} 