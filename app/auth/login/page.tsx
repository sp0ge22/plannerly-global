// File: app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { AuthError } from '@supabase/supabase-js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // First try to sign in
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // If sign in fails, check if they have a pending invite
        const { data: invite } = await supabase
          .from('invites')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (invite && !invite.used) {
          // They have an unused invite - redirect to signup
          router.push(`/auth/signup?email=${encodeURIComponent(email)}`);
          return;
        }

        // No invite or other error - show error message
        throw error;
      }

      // Successful login - redirect to home
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
    <div className="w-full">
      <div className="space-y-2 mb-6">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="text-neutral-400">
          Enter your credentials to access your account
        </p>
      </div>
      
      <form onSubmit={handleSignIn} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-neutral-200">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500"
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
              className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-500 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          <Button 
            type="submit" 
            className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-neutral-900 px-2 text-neutral-400">Or</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            Continue with Google
          </Button>

          <p className="text-sm text-center text-neutral-400">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
