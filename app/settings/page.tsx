'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Crown } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface UserTenant {
  tenant_id: string
  is_owner: boolean
  tenants: {
    id: string
    name: string
  }
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [avatarColor, setAvatarColor] = useState('bg-red-600')
  const [avatarLetter, setAvatarLetter] = useState('U')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [isSavingOrg, setIsSavingOrg] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [isEditingOrgName, setIsEditingOrgName] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [newTenantId, setNewTenantId] = useState('')
  const [isJoiningOrg, setIsJoiningOrg] = useState(false)
  const [organizations, setOrganizations] = useState<Array<{
    id: string;
    name: string;
    is_owner: boolean;
  }>>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          // Load profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('name, avatar_color, avatar_letter')
            .eq('id', session.user.id)
            .single()

          if (profileError) throw profileError
          if (profileData) {
            setName(profileData.name || '')
            setAvatarColor(profileData.avatar_color || 'bg-red-600')
            setAvatarLetter(profileData.avatar_letter || 'U')
          }

          // Get all user's tenant relationships and tenant details
          const { data: userTenants, error: userTenantError } = await supabase
            .from('user_tenants')
            .select(`
              tenant_id,
              is_owner,
              tenants (
                id,
                name
              )
            `)
            .eq('user_id', session.user.id) as { data: UserTenant[] | null, error: any }

          if (userTenantError) throw userTenantError

          if (userTenants) {
            const orgs = userTenants.map(ut => ({
              id: ut.tenant_id,
              name: ut.tenants.name,
              is_owner: ut.is_owner
            }))
            setOrganizations(orgs)
            
            // Set the first organization as selected by default
            if (orgs.length > 0 && !selectedOrgId) {
              setSelectedOrgId(orgs[0].id)
            }

            // Get members for the selected organization
            if (selectedOrgId) {
              const { data: orgMembers, error: membersError } = await supabase
                .from('user_tenants')
                .select('user_id, is_owner')
                .eq('tenant_id', selectedOrgId)

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
        }
      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: "Error loading settings",
          description: "Please try again later.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [supabase, toast, selectedOrgId])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          name: name.trim(),
          avatar_color: avatarColor,
          avatar_letter: avatarLetter,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error saving settings",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      const session = (await supabase.auth.getSession()).data.session
      if (!session?.user?.email) {
        toast({
          title: "Error changing password",
          description: "Could not verify user email.",
          variant: "destructive",
        })
        return
      }

      // First verify the current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: currentPassword,
      })

      if (signInError) {
        toast({
          title: "Current password is incorrect",
          description: "Please verify your current password.",
          variant: "destructive",
        })
        return
      }

      // If current password is correct, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) throw updateError

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      })

      // Clear password fields
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: "Error changing password",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSaveOrganization = async () => {
    if (!tenantId || !organizationName.trim()) return

    setIsSavingOrg(true)
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          name: organizationName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) {
        console.error('Error updating tenant:', error)
        throw error
      }

      toast({
        title: "Organization updated",
        description: "Your organization settings have been saved successfully.",
      })

      // Refresh the page to show updated data
      router.refresh()
    } catch (error) {
      console.error('Error saving organization:', error)
      toast({
        title: "Error saving organization",
        description: "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSavingOrg(false)
    }
  }

  const handleJoinOrganization = async () => {
    if (!newTenantId.trim()) return
    
    setIsJoiningOrg(true)
    try {
      // First verify the tenant exists
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', newTenantId)
        .single()

      if (tenantError) {
        throw new Error('Organization not found')
      }

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        throw new Error('Not authenticated')
      }

      // Check if already a member
      const { data: existingMembership, error: membershipError } = await supabase
        .from('user_tenants')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('tenant_id', newTenantId)
        .single()

      if (existingMembership) {
        throw new Error('You are already a member of this organization')
      }

      // Add user to organization
      const { error: joinError } = await supabase
        .from('user_tenants')
        .insert([{
          user_id: session.user.id,
          tenant_id: newTenantId,
          is_owner: false
        }])

      if (joinError) throw joinError

      toast({
        title: "Success",
        description: `You have joined ${tenant.name}`,
      })

      // Clear the input
      setNewTenantId('')
      
      // Refresh the page to show the new organization
      router.refresh()
    } catch (error) {
      console.error('Error joining organization:', error)
      toast({
        title: "Error joining organization",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsJoiningOrg(false)
    }
  }

  const avatarColorOptions = [
    { value: 'bg-red-600', label: 'Red' },
    { value: 'bg-blue-600', label: 'Blue' },
    { value: 'bg-green-600', label: 'Green' },
    { value: 'bg-purple-600', label: 'Purple' },
    { value: 'bg-yellow-600', label: 'Yellow' },
    { value: 'bg-pink-600', label: 'Pink' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-neutral-50">
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold">Settings</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarLetter">Avatar Letter</Label>
                  <Input
                    id="avatarLetter"
                    placeholder="Single letter"
                    value={avatarLetter}
                    onChange={(e) => setAvatarLetter(e.target.value.charAt(0).toUpperCase())}
                    maxLength={1}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatarColor">Avatar Color</Label>
                  <Select
                    value={avatarColor}
                    onValueChange={setAvatarColor}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a color" />
                    </SelectTrigger>
                    <SelectContent>
                      {avatarColorOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
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
                <CardTitle>Password</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword || isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Organizations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className={`p-4 rounded-lg border ${
                        selectedOrgId === org.id ? 'border-primary' : 'border-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium flex items-center">
                            {org.name}
                            {org.is_owner && (
                              <Crown className="w-4 h-4 ml-2 text-yellow-500" />
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {org.is_owner ? 'Owner' : 'Member'}
                          </p>
                          <div className="text-xs text-muted-foreground font-mono mt-1">
                            ID: {org.id}
                          </div>
                        </div>
                        <div className="space-x-2">
                          <Button
                            variant={selectedOrgId === org.id ? "default" : "outline"}
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            {selectedOrgId === org.id ? 'Selected' : 'Select'}
                          </Button>
                          {org.is_owner && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedOrgId(org.id)
                                setNewOrgName(org.name)
                                setIsEditingOrgName(true)
                              }}
                            >
                              Edit Name
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedOrgId && (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-semibold">Organization Members</h3>
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
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Join Another Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Organization ID</Label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter organization ID"
                      value={newTenantId}
                      onChange={(e) => setNewTenantId(e.target.value)}
                      disabled={isJoiningOrg}
                    />
                    <Button
                      onClick={handleJoinOrganization}
                      disabled={isJoiningOrg || !newTenantId.trim()}
                    >
                      {isJoiningOrg ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        'Join'
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Ask the organization owner for their Organization ID to join their organization.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
