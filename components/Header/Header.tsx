'use client'

import { Bell, Menu, X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Settings, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function Header() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [avatarColor, setAvatarColor] = useState('')
  const [avatarLetter, setAvatarLetter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('avatar_color, avatar_letter, is_admin, avatar_url')
            .eq('id', session.user.id)
            .single()

          if (!error && data) {
            setAvatarColor(data.avatar_color || 'bg-red-600')
            setAvatarLetter(data.avatar_letter || 'U')
            setIsAdmin(data.is_admin || false)
            if (data.avatar_url) {
              localStorage.setItem('avatarUrl', data.avatar_url)
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuthAndLoadProfile()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session)
      if (!session) {
        setAvatarColor('')
        setAvatarLetter('')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleSignOut = async () => {
    try {
      // Reset local state first
      setIsAuthenticated(false)
      
      // Clear any localStorage data
      localStorage.clear()
      
      // Attempt to sign out from Supabase - don't throw on error
      await supabase.auth.signOut().catch(console.error)
      
      // Clear cookies by setting them to expire
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
      
      // Clear any cached data
      await router.refresh()
      
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force a complete page reload and redirect
      window.location.href = '/'
    } catch (error) {
      console.error('Error during sign out:', error)
      // Force redirect anyway
      window.location.href = '/'
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-black text-white">
      <div className="flex items-center justify-between px-4 py-4 md:px-6">
        {/* Logo and Navigation Container */}
        <div className="flex items-center flex-1">
          <Link href="/home" className="flex items-center space-x-2 mr-8">
            <Image
              src="https://i.imgur.com/SvnWJ0L.png"
              alt="Business Dashboard Logo"
              width={45}
              height={45}
              className="relative object-contain rounded-full"
              priority
            />
            <h1 className="text-xl md:text-2xl font-bold">Business Dashboard</h1>
          </Link>

          {/* Desktop Navigation moved here */}
          <nav className="hidden md:block">
            <ul className="flex space-x-2">
              <li><Link href="/tasks"><Button variant="ghost">Tasks</Button></Link></li>
              <li><Link href="/timesheet"><Button variant="ghost">Time Sheet</Button></Link></li>
              <li><Link href="/resources"><Button variant="ghost">Resources</Button></Link></li>
              <li><Link href="/notes"><Button variant="ghost">Notes</Button></Link></li>
              <li><Link href="/email-assistant"><Button variant="ghost">Email Assistant</Button></Link></li>
            </ul>
          </nav>
        </div>

        {/* Mobile menu button and right controls stay in their container */}
        <div className="flex items-center space-x-4">
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          <AnimatePresence mode="popLayout">
            {isAuthenticated ? (
              <>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="hidden md:block"
                >
                  <Button variant="ghost" size="icon" className="text-white hover:text-white">
                    <Bell className="h-5 w-5" />
                  </Button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar>
                          <AvatarImage src={localStorage.getItem('avatarUrl') || undefined} />
                          <AvatarFallback className={isLoading ? 'animate-pulse bg-gray-600' : avatarColor}>
                            {isLoading ? '' : avatarLetter}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                        </Link>
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            <span>User Management</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleSignOut}>
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              </>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Navigation Menu stays the same */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border"
          >
            <ul className="flex flex-col p-4 space-y-2">
              <li><Link href="/tasks" onClick={() => setIsMobileMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Tasks</Button></Link></li>
              <li><Link href="/timesheet" onClick={() => setIsMobileMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Time Sheet</Button></Link></li>
              <li><Link href="/resources" onClick={() => setIsMobileMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Resources</Button></Link></li>
              <li><Link href="/notes" onClick={() => setIsMobileMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Notes</Button></Link></li>
              <li><Link href="/email-assistant" onClick={() => setIsMobileMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Email Assistant</Button></Link></li>
              {isAuthenticated && (
                <li className="md:hidden">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Bell className="h-5 w-5 mr-2" />
                    Notifications
                  </Button>
                </li>
              )}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
