'use client'

import { useState } from 'react'
import { Login } from '../login'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen grid place-items-center">
      <Login
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        setMode={() => router.push('/auth/signup')}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
      />
    </div>
  )
} 