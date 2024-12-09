// File: app/page.tsx (Landing Page)
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/ui/icons"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from 'framer-motion'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AuthError } from '@supabase/supabase-js'

type AuthMode = 'login' | 'signup' | 'verify'

export default function LandingPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  
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
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: name,
          }
        }
      })

      if (signUpError) throw signUpError

      // Create profile after successful signup
      if (authData.user) {
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
      }

      setMode('verify')
      
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your signup.",
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const renderForm = () => {
    switch (mode) {
      case 'verify':
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

      case 'login':
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
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Icons.google className="mr-2 h-4 w-4" />
                Sign in with Google
              </Button>
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

      case 'signup':
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
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <Icons.google className="mr-2 h-4 w-4" />
                Sign Up with Google
              </Button>
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
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-[400px] px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderForm()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="font-semibold">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="text-lg font-semibold">1. Introduction</h3>
                <p>
                  Shinespike Limited ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">2. Information We Collect</h3>
                <p>We collect information that you provide directly to us, including:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Name and contact information</li>
                  <li>Account credentials</li>
                  <li>Profile information</li>
                  <li>Communication preferences</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">3. How We Use Your Information</h3>
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide and maintain our services</li>
                  <li>Process your transactions</li>
                  <li>Send you service-related communications</li>
                  <li>Improve and optimize our services</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">4. Contact Us</h3>
                <p>
                  If you have any questions about this Privacy Policy, please contact us at:
                  <br />
                  Shinespike Limited
                  <br />
                  Email: privacy@shinespike.com
                </p>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="font-semibold">Last updated: {new Date().toLocaleDateString()}</p>
            
            <div className="space-y-4">
              <section className="space-y-2">
                <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
                <p>
                  By accessing and using the services provided by Shinespike Limited ("we", "our", or "us"), you agree to be bound by these Terms of Service and all applicable laws and regulations.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">2. Use License</h3>
                <p>
                  We grant you a limited, non-exclusive, non-transferable license to use our services for your personal or business purposes, subject to these Terms.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">3. User Obligations</h3>
                <ul className="list-disc pl-6 space-y-1">
                  <li>You must provide accurate information when creating an account</li>
                  <li>You are responsible for maintaining the security of your account</li>
                  <li>You agree not to use the service for any illegal purposes</li>
                  <li>You will not attempt to breach or circumvent any security measures</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-lg font-semibold">4. Contact</h3>
                <p>
                  For any questions regarding these Terms, please contact:
                  <br />
                  Shinespike Limited
                  <br />
                  Email: legal@shinespike.com
                </p>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
