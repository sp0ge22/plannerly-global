'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface OrgMember {
  user_id: string
  is_owner: boolean
  profile: {
    name: string | null
    email: string | null
    avatar_letter: string | null
    avatar_color: string | null
  }
}

export default function OrganizationSettingsPage() {
  const [organizationName, setOrganizationName] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [members, setMembers] = useState<OrgMember[]>([])
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadOrganization = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Get user's tenant relationship
          const { data: userTenant, error: userTenantError } = await supabase
            .from('user_tenants')
            .select('tenant_id, is_owner')
            .eq('user_id', session.user.id)
            .single()

          if (userTenantError) throw userTenantError

          if (userTenant) {
            setTenantId(userTenant.tenant_id)
            setIsOwner(userTenant.is_owner)

            if (!userTenant.is_owner) {
              // Redirect non-owners back to settings
              router.push('/settings')
              return
            }

            // Get tenant details
            const { data: tenant, error: tenantError } = await supabase
              .from('tenants')
              .select('name')
              .eq('id', userTenant.tenant_id)
              .single()

            if (tenantError) throw tenantError
            if (tenant) {
              setOrganizationName(tenant.name)
            }

            // Get all members of the organization
            const { data: orgMembers, error: membersError } = await supabase
              .from('user_tenants')
              .select('user_id, is_owner')
              .eq('tenant_id', userTenant.tenant_id)

            if (membersError) throw membersError

            if (orgMembers) {
              // Get profiles for all members
              const userIds = orgMembers.map(member => member.user_id)
              const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, avatar_letter, avatar_color, email')
                .in('id', userIds)

              if (profilesError) throw profilesError

              const formattedMembers: OrgMember[] = orgMembers.map(member => {
                const profile = profiles?.find(p => p.id === member.user_id)
                return {
                  user_id: member.user_id,
                  is_owner: member.is_owner,
                  profile: {
                    email: profile?.email || null,
                    name: profile?.name || null,
                    avatar_letter: profile?.avatar_letter || null,
                    avatar_color: profile?.avatar_color || null
                  }
                }
              })
              setMembers(formattedMembers)
            }
          }
        }
      } catch (error) {
        console.error('Error loading organization:', error)
        toast({
          title: "Error loading organization settings",
          description: "Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganization()
  }, [supabase, toast, router])

  const handleSave = async () => {
    if (!tenantId || !organizationName.trim()) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          name: organizationName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) throw error

      toast({
        title: "Organization updated",
        description: "Your organization settings have been saved successfully.",
      })
    } catch (error) {
      console.error('Error saving organization:', error)
      toast({
        title: "Error saving organization",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Organization Settings</h1>
            <Button 
              variant="outline"
              onClick={() => router.push('/settings')}
            >
              Back to Settings
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  placeholder="Enter organization name"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button 
                onClick={handleSave}
                disabled={isSaving || isLoading || !organizationName.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div 
                    key={member.user_id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full ${member.profile.avatar_color || 'bg-gray-400'} flex items-center justify-center text-white font-semibold`}>
                        {member.profile.avatar_letter || 'U'}
                      </div>
                      <div>
                        <div className="font-medium flex items-center">
                          {member.profile.name || member.profile.email}
                          {member.is_owner && (
                            <Crown className="w-4 h-4 ml-2 text-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {member.is_owner ? 'Owner' : 'Member'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}

                {!isLoading && members.length === 0 && (
                  <div className="text-center text-muted-foreground p-4">
                    No members found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
} 