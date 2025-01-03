'use client'

import { Bell, Menu, X, ChevronDown, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Settings, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"
import { PostgrestError } from '@supabase/supabase-js'

export function Header() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [avatarColor, setAvatarColor] = useState('')
  const [avatarLetter, setAvatarLetter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{
    id: string;
    name: string;
    avatar_url: string | null;
  }>>([])
  const [currentOrg, setCurrentOrg] = useState<{
    id: string;
    name: string;
    avatar_url: string | null;
  } | null>(null)

  useEffect(() => {
    const checkAuthAndLoadProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)

        if (session?.user) {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('avatar_color, avatar_letter, is_admin, avatar_url')
            .eq('id', session.user.id)
            .single()

          if (!error && profileData) {
            setAvatarColor(profileData.avatar_color || 'bg-red-600')
            setAvatarLetter(profileData.avatar_letter || 'U')
            setIsAdmin(profileData.is_admin || false)
            if (profileData.avatar_url) {
              localStorage.setItem('avatarUrl', profileData.avatar_url)
            }
          }

          // Fetch user's organizations
          type TenantResponse = {
            tenant_id: string;
            tenants: {
              id: string;
              name: string;
              avatar_url: string | null;
            };
          }

          const { data: userTenants, error: tenantError } = await supabase
            .from('user_tenants')
            .select(`
              tenant_id,
              tenants:tenant_id (
                id,
                name,
                avatar_url
              )
            `)
            .eq('user_id', session.user.id) as { 
              data: TenantResponse[] | null; 
              error: PostgrestError | null; 
            }

          if (!tenantError && userTenants) {
            const orgs = userTenants
              .map(ut => ut.tenants)
              .filter((tenant): tenant is { id: string; name: string; avatar_url: string | null } => 
                tenant !== null && 
                'id' in tenant && 
                'name' in tenant
              )

            setOrganizations(orgs)
            
            // Set first org as current if none selected
            const savedOrgId = localStorage.getItem('currentOrgId')
            const initialOrg = savedOrgId 
              ? orgs.find(org => org.id === savedOrgId)
              : orgs[0]

            if (initialOrg) {
              setCurrentOrg(initialOrg)
              localStorage.setItem('currentOrgId', initialOrg.id)
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
          {currentOrg ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-3 mr-8 px-2 hover:bg-white/10"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentOrg.avatar_url ?? undefined} />
                    <AvatarFallback>
                      {currentOrg.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center">
                    <span className="text-lg font-semibold">{currentOrg.name}</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[200px]">
                <DropdownMenuLabel className="text-foreground">Switch Organization</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    className={cn(
                      "flex items-center space-x-2 cursor-pointer text-foreground",
                      currentOrg?.id === org.id && "bg-accent"
                    )}
                    onClick={() => {
                      setCurrentOrg(org)
                      localStorage.setItem('currentOrgId', org.id)
                    }}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={org.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {org.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{org.name}</span>
                    {currentOrg?.id === org.id && (
                      <Check className="h-4 w-4 ml-auto" />
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer text-foreground">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Manage Organizations</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : isAuthenticated && !isLoading ? (
            <Button 
              variant="outline" 
              className="flex items-center space-x-2 text-white border-white hover:bg-white/10 mr-8"
              onClick={() => router.push('/settings')}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Set Up Organization</span>
                <div className="flex items-center justify-center h-5 w-5 rounded-full border border-white">
                  <span className="text-sm font-bold">!</span>
                </div>
              </div>
            </Button>
          ) : (
            <div className="flex items-center space-x-3 mr-8">
              <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse" />
              <div className="h-6 w-32 bg-gray-700 rounded animate-pulse" />
            </div>
          )}

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
              <li><Link href="/resources" onClick={() => setIsMobileMenuOpen(false)}><Button variant="ghost" className="w-full justify-start">Resources</Button></Link></li>
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
