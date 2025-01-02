'use client'

import { useState } from 'react'
import { SignUp } from '../signup'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen grid place-items-center">
      <SignUp
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        name={name}
        setName={setName}
        organizationName={organizationName}
        setOrganizationName={setOrganizationName}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        setMode={() => router.push('/auth/login')}
        setShowTerms={setShowTerms}
        setShowPrivacyPolicy={setShowPrivacyPolicy}
      />
    </div>
  )
} 