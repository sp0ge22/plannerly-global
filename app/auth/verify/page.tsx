'use client'

import { useState, Suspense } from 'react'
import { Verify } from '../verify'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/ui/icons"
import { Loader2, Mail } from 'lucide-react'

function LoadingSpinner() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center space-x-2">
          <Icons.logo className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl font-bold">Plannerly</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-pulse" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
          </div>
        </div>
        <p className="text-lg font-medium text-center text-muted-foreground">
          Loading verification status...
        </p>
      </CardContent>
    </Card>
  )
}

function VerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  return (
    <Verify
      email={email}
      setMode={() => router.push('/auth/login')}
    />
  )
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-gray-50 to-white p-4">
      <Suspense fallback={<LoadingSpinner />}>
        <VerifyContent />
      </Suspense>
    </div>
  )
} 