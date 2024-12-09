// File: app/auth/signup/page.tsx
'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Icons } from "@/components/ui/icons"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long')
      }

      // Get the access key from URL if it exists
      const searchParams = new URLSearchParams(window.location.search)
      const accessKey = searchParams.get('key')

      // Make API call to signup endpoint
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          accessKey,
          organizationName: organizationName.trim()
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to complete your signup.",
      })

      router.push('/auth/verify')
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

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
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
                id="organizationName"
                placeholder="Organization Name"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
              <Input
                id="password"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
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
              <Link href="/terms" className="hover:text-primary underline underline-offset-4">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="hover:text-primary underline underline-offset-4">
                Privacy Policy
              </Link>
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
          <Button className="w-full" variant="outline" asChild>
            <Link href="/login">Log In</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
