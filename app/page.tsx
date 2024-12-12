'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion, AnimatePresence } from 'framer-motion'
import { Login } from './auth/login'
import { SignUp } from './auth/signup'
import { Verify } from './auth/verify'
import { Icons } from "@/components/ui/icons"

type AuthMode = 'login' | 'signup' | 'verify'

export default function LandingPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const renderForm = () => {
    switch (mode) {
      case 'verify':
        return (
          <Verify 
            email={email}
            setMode={setMode}
          />
        )
      case 'login':
        return (
          <Login
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            setMode={setMode}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )
      case 'signup':
        return (
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
            setMode={setMode}
            setShowTerms={setShowTerms}
            setShowPrivacyPolicy={setShowPrivacyPolicy}
          />
        )
    }
  }

  return (
    <>
      <div className="flex min-h-screen">
        {/* Left side - Black screen with Plannerly text, icon, and features */}
        <div className="w-1/2 bg-black text-white flex flex-col items-center justify-center">
          <Icons.logo className="h-24 w-24 text-white mb-4" />
          <h1 className="text-4xl font-bold mb-2">Plannerly</h1>
          <p className="text-xl mb-8">Plan. Collaborate. Succeed.</p>
          
          {/* Feature Showcase */}
          <div className="grid grid-cols-1 gap-6 max-w-[300px]">
            <div className="flex items-center space-x-4">
              <Icons.task className="h-8 w-8 text-primary" />
              <p className="text-lg">Track your tasks effortlessly.</p>
            </div>
            <div className="flex items-center space-x-4">
              <Icons.aiAssistant className="h-8 w-8 text-primary" />
              <p className="text-lg">AI-powered email assistant.</p>
            </div>
            <div className="flex items-center space-x-4">
              <Icons.resources className="h-8 w-8 text-primary" />
              <p className="text-lg">Bookmark useful resources.</p>
            </div>
            <div className="flex items-center space-x-4">
              <Icons.collaboration className="h-8 w-8 text-primary" />
              <p className="text-lg">Collaborate with your team.</p>
            </div>
          </div>
        </div>

        {/* Right side - Authentication forms */}
        <div className="w-1/2 bg-background flex items-center justify-center">
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
      </div>

      {/* Privacy Policy Modal */}
      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
          {/* ... (privacy policy content remains the same) ... */}
        </DialogContent>
      </Dialog>

      {/* Terms of Service Modal */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
          {/* ... (terms of service content remains the same) ... */}
        </DialogContent>
      </Dialog>
    </>
  )
}
