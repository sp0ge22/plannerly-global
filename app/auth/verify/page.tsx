'use client'

import { Loader2 } from 'lucide-react'

export default function VerifyPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
        <h1 className="text-2xl font-bold text-white">Check your email</h1>
        <p className="text-neutral-400 max-w-sm">
          We sent you a verification link. Click the link in your email to verify your account.
        </p>
      </div>
    </div>
  )
}
