'use client'

import { useState } from 'react'
import { Verify } from '../verify'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  return (
    <div className="min-h-screen grid place-items-center">
      <Verify
        email={email}
        setMode={() => router.push('/auth/login')}
      />
    </div>
  )
} 