// File: app/page.tsx (Landing Page)
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const [isLoading, setIsLoading] = useState(false)
  
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
        }
      })

      if (signUpError) throw signUpError

      // Create profile after successful signup
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            email: email.toLowerCase(),
            avatar_color: 'bg-red-600',
            avatar_letter: 'U',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])

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
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Check your email</h2>
            <p className="text-neutral-400 max-w-sm">
              We sent you a verification link to {email}. Click the link in your email to verify your account.
            </p>
            <Button 
              variant="ghost" 
              className="text-neutral-400 hover:text-white"
              onClick={() => setMode('login')}
            >
              Back to login
            </Button>
          </div>
        )

      case 'login':
        return (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-neutral-800/50 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-200">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-neutral-800/50 border-neutral-700 text-white"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </Button>
          </form>
        )

      case 'signup':
        return (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-neutral-800/50 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-neutral-800/50 border-neutral-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-neutral-200">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-neutral-800/50 border-neutral-700 text-white"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : 'Create account'}
            </Button>
          </form>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.1),transparent_50%)]" />
      
      <div className="relative container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full max-w-md mb-12 flex flex-col items-center">
          <div className="relative mb-6">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-30" />
            <Image
              src="https://i.imgur.com/SvnWJ0L.png"
              alt="Business Dashboard Logo"
              width={80}
              height={80}
              className="relative object-contain rounded-full"
              priority
            />
          </div>
          
          <h1 className="text-4xl font-bold text-white text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">
            Business Dashboard
          </h1>

          <div className="w-full max-w-xs bg-neutral-800/50 backdrop-blur-sm rounded-lg p-1 mb-8">
            <div className="relative flex">
              <motion.div
                className="absolute inset-0 w-1/2 h-full bg-blue-500 rounded-md"
                animate={{ x: mode === 'login' ? 0 : '100%' }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <Button
                variant="ghost"
                className={`flex-1 relative z-10 ${mode === 'login' ? 'text-white' : 'text-neutral-400'}`}
                onClick={() => setMode('login')}
              >
                Sign in
              </Button>
              <Button
                variant="ghost"
                className={`flex-1 relative z-10 ${mode === 'signup' ? 'text-white' : 'text-neutral-400'}`}
                onClick={() => setMode('signup')}
              >
                Sign up
              </Button>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-neutral-800/30 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-neutral-700/50"
          >
            {renderForm()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
