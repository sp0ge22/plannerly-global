'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { motion, AnimatePresence } from 'framer-motion'
import { Login } from './auth/login'
import { SignUp } from './auth/signup'
import { Verify } from './auth/verify'
import { Icons } from "@/components/ui/icons"
import { ChevronDown } from 'lucide-react'

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
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null)

  const features = [
    {
      icon: Icons.task,
      title: "Smart Task Management",
      description: "Transform natural language instructions into well-structured tasks with AI-powered task creation and assignment.",
      details: [
        "AI converts informal descriptions into clear, actionable tasks",
        "Automatic task title and description generation",
        "Natural language smart task assignment - one input to create and assign tasks",
        "Real-time in-task messaging and team collaboration"
      ]
    },
    {
      icon: Icons.resources,
      title: "Centralized Resources",
      description: "Organize and manage your team's important links and resources with AI-powered categorization.",
      details: [
        "Smart Resource Management - AI auto-detects website details from a single input",
        "Automatic logo and metadata extraction",
        "Intelligent category suggestions and organization",
        "Custom categorization and resource tagging"
      ]
    },
    {
      icon: Icons.aiAssistant,
      title: "AI-Powered Communication",
      description: "Create and manage organization-wide email response prompts with AI assistance.",
      details: [
        "Smart prompt creation - AI generates response templates from one input",
        "Organization-wide prompt library for common scenarios",
        "Customizable AI response styles and tone settings",
        "Collaborative prompt editing and version management"
      ]
    },
    {
      icon: Icons.collaboration,
      title: "Seamless Collaboration",
      description: "Maintain your private workspace while selectively collaborating with other organizations.",
      details: [
        "Private organizational workspace with complete control",
        "Selective cross-organization collaboration without exposing internal data",
        "Flexible team hierarchy and permission management",
        "Smart workspace switching between your organization and partners"
      ]
    }
  ]

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
        {/* Left side - Black screen with Plannerly branding and feature highlights */}
        <div className="w-1/2 bg-black text-white flex flex-col items-center justify-center px-12">
          <div className="max-w-[520px] w-full">
            {/* Branding Section */}
            <motion.div 
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-xl leading-relaxed text-gray-300">
                Your all-in-one workspace for smarter team collaboration and planning. 
              </p>
            </motion.div>

            {/* Feature Highlights */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  className={`bg-white/5 rounded-xl p-6 cursor-pointer transition-all duration-300 
                    ${expandedFeature === index ? 'bg-white/15 shadow-lg' : 'hover:bg-white/10'}`}
                  onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <feature.icon className="h-8 w-8 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <motion.div
                      animate={{ rotate: expandedFeature === index ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="ml-auto"
                    >
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </motion.div>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">
                    {feature.description}
                  </p>

                  <AnimatePresence>
                    {expandedFeature === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-white/10">
                          <ul className="space-y-3">
                            {feature.details.map((detail, i) => (
                              <motion.li
                                key={i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: i * 0.1 }}
                                className="flex items-center text-sm text-gray-300"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-primary mr-3" />
                                {detail}
                              </motion.li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
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

      <Dialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Privacy Policy</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms of Service</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}