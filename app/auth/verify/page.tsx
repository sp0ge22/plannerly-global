'use client'

import { useState, Suspense } from 'react'
import { Verify } from '../verify'
import { useRouter, useSearchParams } from 'next/navigation'

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
    <div className="min-h-screen grid place-items-center">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  )
} 