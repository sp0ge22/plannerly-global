'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Crown, User, Pencil, Shield, Trash2, UserMinus, ImageIcon, InfoIcon, Building2, Plus } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from 'next/navigation'
import { PostgrestError } from '@supabase/supabase-js'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface TenantResponse {
  tenant_id: string
  is_owner: boolean
  is_admin: boolean
  tenants: {
    id: string
    name: string
    avatar_url: string | null
    pin: string | null
  }
}

interface OrgMember {
  user_id: string
  is_owner: boolean
  is_admin: boolean
  profile: {
    name: string | null
    email: string | null
    avatar_url: string | null
  }
}

interface UserTenant {
  tenant_id: string
  is_owner: boolean
  is_admin: boolean
  tenants: {
    id: string
    name: string
    avatar_url: string | null
    pin: string | null
  }
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
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
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinValue, setPinValue] = useState('')
  const [organizations, setOrganizations] = useState<Array<{
    id: string
    name: string
    is_owner: boolean
    is_admin: boolean
    avatar_url: string | null
    pin: string | null
  }>>([])
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [newPrompt, setNewPrompt] = useState({
    tenant_id: '',
    title: '',
    prompt: '',
    description: null as string | null,
    type: 'response' as 'response' | 'rewrite'
  })
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const router = useRouter()
  const [memberActionDialog, setMemberActionDialog] = useState<{
    isOpen: boolean;
    action: 'make_admin' | 'remove_admin' | 'remove_member';
    memberId: string;
    memberName: string;
  } | null>(null);
  const [showPinInfoDialog, setShowPinInfoDialog] = useState(false)
  const [leaveOrgDialog, setLeaveOrgDialog] = useState<{
    isOpen: boolean;
    orgId: string;
    orgName: string;
  } | null>(null);
  const [confirmOrgName, setConfirmOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [newOrgData, setNewOrgData] = useState({
    name: '',
    avatar: null as File | null,
    pin: ''
  })
  const [deleteOrgDialog, setDeleteOrgDialog] = useState<{
    isOpen: boolean;
    orgId: string;
    orgName: string;
  } | null>(null);
  const [deleteOrgPin, setDeleteOrgPin] = useState('');
  const [deleteOrgConfirmName, setDeleteOrgConfirmName] = useState('');

  useEffect(() => {
    const fetchTenants = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user profile including avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profile) {
        setName(profile.name || '')
        setAvatarUrl(profile.avatar_url)
      }

      const { data: userTenants, error } = await supabase
        .from('user_tenants')
        .select(`
          tenant_id,
          is_owner,
          is_admin,
          tenants:tenant_id (
            id,
            name,
            avatar_url,
            pin
          )
        `)
        .eq('user_id', user.id)
        .returns<TenantResponse[]>()

      if (error) {
        console.error('Error fetching tenants:', error)
        toast({
          title: "Error fetching organizations",
          description: "Could not load your organizations.",
          variant: "destructive",
        })
        return
      }

      const fetchedTenants = userTenants
        .map(ut => ({
          id: ut.tenants.id,
          name: ut.tenants.name,
          is_owner: ut.is_owner,
          is_admin: ut.is_admin,
          avatar_url: ut.tenants.avatar_url,
          pin: ut.tenants.pin
        }))
        .sort((a, b) => {
          // Sort by role priority: owner -> admin -> member
          if (a.is_owner && !b.is_owner) return -1
          if (!a.is_owner && b.is_owner) return 1
          if (a.is_admin && !b.is_admin) return -1
          if (!a.is_admin && b.is_admin) return 1
          // If same role level, sort alphabetically by name
          return a.name.localeCompare(b.name)
        })

      setOrganizations(fetchedTenants)
      
      // Set the first organization as selected by default
      if (fetchedTenants.length > 0 && !selectedOrgId) {
        setSelectedOrgId(fetchedTenants[0].id)
      }

      // Update newPrompt tenant_id if needed
      if (fetchedTenants.length > 0) {
        setNewPrompt(prev => ({ ...prev, tenant_id: fetchedTenants[0].id }))
      }

      // Fetch members if an organization is selected
      if (selectedOrgId) {
        setIsLoading(true)
        try {
          const { data: orgMembers, error: membersError } = await supabase
            .from('user_tenants')
            .select(`
              user_id,
              is_owner,
              is_admin
            `)
            .eq('tenant_id', selectedOrgId)

          if (membersError) throw membersError

          if (orgMembers) {
            // Get profiles for all members
            const userIds = orgMembers.map(member => member.user_id)
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name, email, avatar_url')
              .in('id', userIds)

            if (profilesError) throw profilesError

            const formattedMembers: OrgMember[] = orgMembers.map(member => {
              const profile = profiles?.find(p => p.id === member.user_id)
              return {
                user_id: member.user_id,
                is_owner: member.is_owner,
                is_admin: member.is_admin,
                profile: {
                  email: profile?.email || null,
                  name: profile?.name || null,
                  avatar_url: profile?.avatar_url || null
                }
              }
            })
            setMembers(formattedMembers)
          }
        } catch (error) {
          console.error('Error fetching members:', error)
          toast({
            title: "Error loading members",
            description: "Could not load organization members.",
            variant: "destructive",
          })
        } finally {
          setIsLoading(false)
        }
      }
    }

    fetchTenants()
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

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      const file = event.target.files?.[0]
      if (!file) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) throw new Error('No user session found')

      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}/${Math.random()}.${fileExt}`

      // Upload the file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      toast({
        title: "Success",
        description: "Avatar updated successfully",
      })
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Error",
        description: "There was an error uploading your avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const toggleAdmin = async (userId: string, tenantId: string, makeAdmin: boolean) => {
    try {
      const response = await fetch('/api/user-tenants/update-role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          tenant_id: tenantId,
          is_admin: makeAdmin
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      // Update local state
      setMembers(members.map(member => 
        member.user_id === userId 
          ? { ...member, is_admin: makeAdmin }
          : member
      ))

      toast({
        title: "Role updated",
        description: `User ${makeAdmin ? 'promoted to' : 'removed from'} admin role.`,
      })
    } catch (error) {
      console.error('Error updating role:', error)
      toast({
        title: "Error updating role",
        description: "Could not update user role.",
        variant: "destructive",
      })
    }
  }

  const handleMemberAction = async (pin: string) => {
    if (!memberActionDialog || !selectedOrgId) return;
    
    try {
      // First verify the PIN
      const pinResponse = await fetch('/api/verify-org-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: selectedOrgId,
          pin: pin
        }),
      });

      if (!pinResponse.ok) {
        throw new Error('Invalid PIN');
      }

      // Perform the action based on type
      if (memberActionDialog.action === 'remove_member') {
        const response = await fetch('/api/user-tenants/remove-member', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: memberActionDialog.memberId,
            tenant_id: selectedOrgId
          }),
        });

        if (!response.ok) throw new Error('Failed to remove member');

        // Update local state
        setMembers(members.filter(m => m.user_id !== memberActionDialog.memberId));
      } else {
        // Toggle admin status
        const makeAdmin = memberActionDialog.action === 'make_admin';
        await toggleAdmin(memberActionDialog.memberId, selectedOrgId, makeAdmin);
      }

      setMemberActionDialog(null);
      setPinValue('');

      toast({
        title: "Success",
        description: memberActionDialog.action === 'remove_member'
          ? "Member removed successfully"
          : memberActionDialog.action === 'make_admin'
            ? "User promoted to admin"
            : "Admin role removed",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Action failed",
        variant: "destructive",
      });
    }
  };

  const handleOrgAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)

      const file = event.target.files?.[0]
      if (!file || !selectedOrgId) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${selectedOrgId}/${fileName}`

      // First check if there's an existing avatar to remove
      const currentOrg = organizations.find(org => org.id === selectedOrgId)
      if (currentOrg?.avatar_url) {
        const oldPath = currentOrg.avatar_url.split('/').slice(-2).join('/')
        try {
          await supabase.storage
            .from('org-avatars')
            .remove([oldPath])
        } catch (error) {
          console.error('Error removing old avatar:', error)
        }
      }

      // Upload new file
      const { error: uploadError, data } = await supabase.storage
        .from('org-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('org-avatars')
        .getPublicUrl(filePath)

      // Update tenant record
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ avatar_url: publicUrl })
        .eq('id', selectedOrgId)

      if (updateError) {
        console.error('Update error details:', updateError)
        throw new Error(`Database update failed: ${updateError.message}`)
      }

      // Update local state
      setOrganizations(orgs =>
        orgs.map(org =>
          org.id === selectedOrgId
            ? { ...org, avatar_url: publicUrl }
            : org
        )
      )

      toast({
        title: "Success",
        description: "Organization avatar updated successfully",
      })

      // Add refresh here
      router.refresh()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an error uploading the avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleLeaveOrg = async () => {
    if (!leaveOrgDialog || confirmOrgName !== leaveOrgDialog.orgName) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_tenants')
        .delete()
        .eq('user_id', session.user.id)
        .eq('tenant_id', leaveOrgDialog.orgId);

      if (error) throw error;

      // Update local state
      setOrganizations(orgs => orgs.filter(org => org.id !== leaveOrgDialog.orgId));
      setLeaveOrgDialog(null);
      setConfirmOrgName('');

      toast({
        title: "Organization left",
        description: `You have left ${leaveOrgDialog.orgName}`,
      });

      // If we were viewing the org we just left, reset selection
      if (selectedOrgId === leaveOrgDialog.orgId) {
        setSelectedOrgId(null);
      }

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error leaving organization:', error);
      toast({
        title: "Error leaving organization",
        description: "There was an error leaving the organization. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgData.name.trim() || newOrgData.pin.length !== 4) return
    
    try {
      // Create organization through secure API endpoint
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newOrgData.name.trim(),
          pin: newOrgData.pin
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create organization')
      }

      const { id, name } = await response.json()

      // Upload avatar if provided
      let avatarUrl = null
      if (newOrgData.avatar) {
        const fileExt = newOrgData.avatar.name.split('.').pop()
        const filePath = `${id}/${Math.random()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('org-avatars')
          .upload(filePath, newOrgData.avatar)

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('org-avatars')
            .getPublicUrl(filePath)

          avatarUrl = publicUrl
          
          // Update tenant with avatar URL
          await supabase
            .from('tenants')
            .update({ avatar_url: publicUrl })
            .eq('id', id)
        }
      }

      // Update local state
      const newOrg = {
        id,
        name,
        is_owner: true,
        is_admin: true,
        avatar_url: avatarUrl,
        pin: newOrgData.pin
      }
      setOrganizations([newOrg, ...organizations])
      setSelectedOrgId(id)

      // Reset form
      setNewOrgData({
        name: '',
        avatar: null,
        pin: ''
      })
      setIsCreatingOrg(false)

      toast({
        title: "Organization created",
        description: "Your new organization has been created successfully.",
      })

      // Refresh the page
      router.refresh()
    } catch (error) {
      console.error('Error creating organization:', error)
      toast({
        title: "Error creating organization",
        description: error instanceof Error ? error.message : "Could not create the organization. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteOrg = async () => {
    if (!deleteOrgDialog || deleteOrgConfirmName !== deleteOrgDialog.orgName) return;
    
    try {
      const response = await fetch(`/api/organizations/${deleteOrgDialog.orgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pin: deleteOrgPin,
          confirmName: deleteOrgConfirmName 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete organization');
      }

      // Update local state
      setOrganizations(orgs => orgs.filter(org => org.id !== deleteOrgDialog.orgId));
      setDeleteOrgDialog(null);
      setDeleteOrgPin('');
      setDeleteOrgConfirmName('');

      // If we were viewing the org we just deleted, reset selection
      if (selectedOrgId === deleteOrgDialog.orgId) {
        setSelectedOrgId(organizations.find(org => org.id !== deleteOrgDialog.orgId)?.id || null);
      }

      toast({
        title: "Organization deleted",
        description: `${deleteOrgDialog.orgName} has been permanently deleted.`,
      });

      // Refresh the page
      router.refresh();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast({
        title: "Error deleting organization",
        description: error instanceof Error ? error.message : "Failed to delete the organization.",
        variant: "destructive",
      });
    }
  };

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
              <CardContent>
                <div className="flex flex-col space-y-8">
                  {/* Profile Picture Section */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Profile Picture</h3>
                    <div className="flex items-start space-x-6">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={avatarUrl || undefined} alt="Profile picture" />
                        <AvatarFallback>
                          {name ? name.slice(0, 2).toUpperCase() : (
                            <User className="h-10 w-10 text-muted-foreground" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-3">
                        <Button 
                          variant="outline" 
                          disabled={uploading} 
                          onClick={() => document.getElementById('avatar-upload')?.click()}
                          className="w-[140px]"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            'Change Picture'
                          )}
                        </Button>
                        <input
                          type="file"
                          id="avatar-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={handleUploadAvatar}
                          disabled={uploading}
                        />
                        <p className="text-[13px] text-muted-foreground">
                          JPG, GIF or PNG. Max size of 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Profile Information Section */}
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-4">Profile Information</h3>
                    <div className="max-w-sm space-y-4">
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

                      <Button 
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
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
              <CardContent>
                <Tabs defaultValue="my-orgs" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="my-orgs">My Organizations</TabsTrigger>
                    <TabsTrigger value="join">Join Organization</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="my-orgs" className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">My Organizations</h3>
                      <Button onClick={() => setIsCreatingOrg(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Organization
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {organizations.map((org) => (
                        <div
                          key={org.id}
                          className={`p-4 rounded-lg border transition-all ${
                            selectedOrgId === org.id 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={org.avatar_url ?? undefined} />
                                  <AvatarFallback>
                                    {org.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                  <h3 className="font-medium flex items-center text-lg">
                                    {org.name}
                                    {org.is_owner && (
                                      <Crown className="w-4 h-4 ml-2 text-yellow-500" />
                                    )}
                                    {org.is_admin && !org.is_owner && (
                                      <Shield className="w-4 h-4 ml-2 text-blue-500" />
                                    )}
                                  </h3>
                                  <div className="flex flex-col space-y-1">
                                    <span className="text-sm text-muted-foreground">
                                      {org.is_owner ? 'Owner' : org.is_admin ? 'Admin' : 'Member'}
                                    </span>
                                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                      <span>ID:</span>
                                      <code className="text-xs font-mono px-1 py-0.5 bg-muted rounded">
                                        {org.id}
                                      </code>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!org.is_owner && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setLeaveOrgDialog({
                                        isOpen: true,
                                        orgId: org.id,
                                        orgName: org.name
                                      });
                                    }}
                                    className="gap-2 text-destructive hover:text-destructive"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                    Leave
                                  </Button>
                                )}
                                {org.is_owner && organizations.filter(o => o.is_owner).length > 1 && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteOrgDialog({
                                        isOpen: true,
                                        orgId: org.id,
                                        orgName: org.name
                                      });
                                    }}
                                    className="gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </Button>
                                )}
                                <Button
                                  variant={selectedOrgId === org.id ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setSelectedOrgId(org.id)}
                                >
                                  {selectedOrgId === org.id ? 'Selected' : 'Select'}
                                </Button>
                              </div>
                            </div>
                            
                            {org.is_owner && (
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 gap-2"
                                  onClick={() => {
                                    setSelectedOrgId(org.id)
                                    setNewOrgName(org.name)
                                    setIsEditingOrgName(true)
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                  Edit Organization
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    setSelectedOrgId(org.id)
                                    setShowPinInfoDialog(true)
                                  }}
                                >
                                  <Shield className="w-4 h-4" />
                                  Manage PIN
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedOrgId && (
                      <div className="space-y-4 pt-6 border-t">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">Organization Members</h3>
                          <p className="text-sm text-muted-foreground">
                            {members.length} {members.length === 1 ? 'member' : 'members'}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[...members]
                            .sort((a, b) => {
                              // First sort by role priority
                              if (a.is_owner && !b.is_owner) return -1;
                              if (!a.is_owner && b.is_owner) return 1;
                              if (a.is_admin && !b.is_admin) return -1;
                              if (!a.is_admin && b.is_admin) return 1;
                              
                              // Then sort by name/email
                              const aName = a.profile.name || a.profile.email || '';
                              const bName = b.profile.name || b.profile.email || '';
                              return aName.localeCompare(bName);
                            })
                            .map((member) => (
                              <div 
                                key={member.user_id}
                                className="flex flex-col p-4 rounded-lg border bg-card"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={member.profile.avatar_url ?? undefined} />
                                      <AvatarFallback className="bg-muted">
                                        <User className="h-5 w-5 text-muted-foreground" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate flex items-center gap-2">
                                        {member.profile.name || member.profile.email}
                                        {member.is_owner && (
                                          <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                        )}
                                        {member.is_admin && !member.is_owner && (
                                          <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-0.5 text-sm">
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          {member.is_owner ? (
                                            <>
                                              <Crown className="w-3 h-3 text-yellow-500" />
                                              <span>Owner</span>
                                            </>
                                          ) : member.is_admin ? (
                                            <>
                                              <Shield className="w-3 h-3 text-blue-500" />
                                              <span>Admin</span>
                                            </>
                                          ) : (
                                            <>
                                              <User className="w-3 h-3" />
                                              <span>Member</span>
                                            </>
                                          )}
                                        </div>
                                        <div className="text-muted-foreground/70 truncate">
                                          {member.profile.email}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedOrgId && organizations.find(org => org.id === selectedOrgId)?.is_owner && !member.is_owner && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant={member.is_admin ? "outline" : "default"}
                                        size="sm"
                                        onClick={() => setMemberActionDialog({
                                          isOpen: true,
                                          action: member.is_admin ? 'remove_admin' : 'make_admin',
                                          memberId: member.user_id,
                                          memberName: member.profile.name || member.profile.email || 'Unknown User'
                                        })}
                                        className="gap-2 whitespace-nowrap"
                                      >
                                        <Shield className={`w-4 h-4 ${member.is_admin ? 'text-blue-500' : ''}`} />
                                        {member.is_admin ? 'Remove Admin' : 'Make Admin'}
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setMemberActionDialog({
                                          isOpen: true,
                                          action: 'remove_member',
                                          memberId: member.user_id,
                                          memberName: member.profile.name || member.profile.email || 'Unknown User'
                                        })}
                                        className="gap-2"
                                      >
                                        <UserMinus className="w-4 h-4" />
                                        Remove
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}

                          {isLoading && (
                            <div className="col-span-2 flex justify-center p-4">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          )}

                          {!isLoading && members.length === 0 && (
                            <div className="col-span-2 text-center text-muted-foreground p-4 border rounded-lg">
                              No members found in this organization
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="join" className="space-y-4">
                    <div className="space-y-4">
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
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Add Edit Organization Dialog */}
            <Dialog open={isEditingOrgName} onOpenChange={setIsEditingOrgName}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Organization</DialogTitle>
                  <DialogDescription>
                    Update your organization's profile
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="bg-muted p-4 rounded-lg space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage 
                          src={organizations.find(org => org.id === selectedOrgId)?.avatar_url ?? undefined}
                        />
                        <AvatarFallback>
                          {newOrgName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">Organization Picture</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          This will be displayed across all organization pages
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={uploading}
                          onClick={() => document.getElementById('org-avatar-upload')?.click()}
                          className="w-[140px]"
                        >
                          {uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Change Picture
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    <input
                      type="file"
                      id="org-avatar-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleOrgAvatarUpload}
                      disabled={uploading}
                    />
                    <div className="text-[13px] text-muted-foreground flex items-center gap-1">
                      <InfoIcon className="w-3 h-3" />
                      <span>JPG, GIF or PNG. Max size of 2MB.</span>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div className="space-y-2">
                      <h4 className="font-medium">Organization Details</h4>
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name</Label>
                        <Input
                          id="org-name"
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="Enter organization name"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-[13px] text-muted-foreground mt-2">
                        <InfoIcon className="w-3 h-3" />
                        <span>This name will be visible to all members of your organization</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <h4 className="font-medium">Owner Settings</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      As the owner, you can manage organization settings, members, and security preferences. Use the Manage PIN option to update your organization's security PIN.
                    </p>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingOrgName(false)
                      setNewOrgName('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedOrgId || !newOrgName.trim()) return
                      
                      try {
                        const { error } = await supabase
                          .from('tenants')
                          .update({ 
                            name: newOrgName.trim(),
                            updated_at: new Date().toISOString()
                          })
                          .eq('id', selectedOrgId)

                        if (error) throw error

                        // Update local state
                        setOrganizations(orgs => 
                          orgs.map(org => 
                            org.id === selectedOrgId 
                              ? { ...org, name: newOrgName.trim() }
                              : org
                          )
                        )

                        setIsEditingOrgName(false)
                        setNewOrgName('')

                        toast({
                          title: "Organization updated",
                          description: "The organization name has been updated successfully.",
                        })

                        // Refresh the page
                        router.refresh()
                      } catch (error) {
                        console.error('Error updating organization:', error)
                        toast({
                          title: "Error updating organization",
                          description: "There was an error updating the organization name. Please try again.",
                          variant: "destructive",
                        })
                      }
                    }}
                    disabled={!newOrgName.trim()}
                  >
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add member action dialog */}
            <Dialog 
              open={memberActionDialog?.isOpen} 
              onOpenChange={(open) => {
                if (!open) {
                  setMemberActionDialog(null);
                  setPinValue('');
                }
              }}
            >
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={organizations.find(org => org.id === selectedOrgId)?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {organizations.find(org => org.id === selectedOrgId)?.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl">Confirm Action</DialogTitle>
                      <DialogDescription className="mt-1">
                        Enter organization PIN to continue
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="mt-6">
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h4 className="font-medium text-sm">Action Details:</h4>
                      <p className="text-sm text-muted-foreground">
                        {memberActionDialog?.action === 'remove_member' 
                          ? `Remove ${memberActionDialog?.memberName} from organization`
                          : memberActionDialog?.action === 'make_admin'
                            ? `Promote ${memberActionDialog?.memberName} to admin`
                            : `Remove admin role from ${memberActionDialog?.memberName}`}
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="pin" className="text-sm font-medium">
                        Organization PIN
                      </Label>
                      <Input
                        id="pin"
                        type="password"
                        value={pinValue}
                        onChange={(e) => setPinValue(e.target.value)}
                        placeholder="Enter 4-digit PIN"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="text-lg tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground">
                        Contact your organization owner if you don't know the PIN
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMemberActionDialog(null);
                      setPinValue('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant={memberActionDialog?.action === 'remove_member' ? 'destructive' : 'default'}
                    onClick={() => handleMemberAction(pinValue)}
                    disabled={!pinValue.trim() || pinValue.length !== 4}
                    className="gap-2"
                  >
                    {memberActionDialog?.action === 'remove_member' ? (
                      <>
                        <UserMinus className="w-4 h-4" />
                        Remove Member
                      </>
                    ) : memberActionDialog?.action === 'make_admin' ? (
                      <>
                        <Shield className="w-4 h-4" />
                        Make Admin
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Remove Admin
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add PIN info dialog */}
            <Dialog open={showPinInfoDialog} onOpenChange={setShowPinInfoDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Organization PIN</DialogTitle>
                  <DialogDescription>
                    Manage your organization's security PIN
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Current PIN display for owners */}
                  {organizations.find(org => org.id === selectedOrgId)?.is_owner && (
                    <div className="bg-muted p-4 rounded-lg space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="org-pin">Organization PIN</Label>
                        <div className="flex gap-2">
                          <Input
                            id="org-pin"
                            value={pin}
                            onChange={(e) => {
                              // Only allow numbers and limit to 4 digits
                              const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                              setPin(value)
                              setPinError('')
                            }}
                            placeholder="Enter 4-digit PIN"
                            maxLength={4}
                            pattern="[0-9]*"
                            inputMode="numeric"
                            className="text-lg tracking-widest"
                          />
                          <Button
                            onClick={async () => {
                              if (!/^\d{4}$/.test(pin)) {
                                setPinError('PIN must be exactly 4 digits')
                                return
                              }
                              
                              try {
                                const { error } = await supabase
                                  .from('tenants')
                                  .update({ pin })
                                  .eq('id', selectedOrgId)

                                if (error) throw error

                                // Update local state
                                setOrganizations(orgs => 
                                  orgs.map(org => 
                                    org.id === selectedOrgId 
                                      ? { ...org, pin }
                                      : org
                                  )
                                )

                                toast({
                                  title: "PIN updated",
                                  description: "The organization PIN has been updated successfully.",
                                })
                              } catch (error) {
                                console.error('Error updating PIN:', error)
                                toast({
                                  title: "Error updating PIN",
                                  description: "There was an error updating the PIN. Please try again.",
                                  variant: "destructive",
                                })
                              }
                            }}
                            disabled={!pin || pin.length !== 4}
                          >
                            Update PIN
                          </Button>
                        </div>
                        {pinError && (
                          <p className="text-sm text-destructive">{pinError}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PIN Information Section */}
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">What is the PIN used for?</h4>
                    <p className="text-sm text-muted-foreground">
                      The organization PIN is a security measure that helps protect sensitive actions within your organization. It's required when:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Removing members from the organization</li>
                      <li>Changing member roles (admin status)</li>
                      <li>Deleting organization resources</li>
                    </ul>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <h4 className="font-medium">Who should know the PIN?</h4>
                    <p className="text-sm text-muted-foreground">
                      The PIN can be shared with trusted administrators who need to perform these actions. As the owner, you can change the PIN at any time.
                    </p>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-yellow-600" />
                      <h4 className="font-medium text-yellow-800">Security Note</h4>
                    </div>
                    <p className="text-sm text-yellow-800">
                      Keep your PIN secure and only share it with trusted administrators. You can change the PIN anytime if you suspect it has been compromised.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      setShowPinInfoDialog(false)
                      setPin('')
                      setPinError('')
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Leave Organization Dialog */}
            <Dialog 
              open={leaveOrgDialog?.isOpen} 
              onOpenChange={(open) => {
                if (!open) {
                  setLeaveOrgDialog(null);
                  setConfirmOrgName('');
                }
              }}
            >
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={organizations.find(org => org.id === leaveOrgDialog?.orgId)?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {leaveOrgDialog?.orgName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl">Leave Organization</DialogTitle>
                      <DialogDescription className="mt-1">
                        This action cannot be undone
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="mt-6">
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                      <h4 className="font-medium text-sm">Organization to Leave:</h4>
                      <p className="text-sm text-muted-foreground">{leaveOrgDialog?.orgName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>You will lose access to all organization resources</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="confirm-name" className="text-sm font-medium">
                        Type organization name to confirm
                      </Label>
                      <Input
                        id="confirm-name"
                        value={confirmOrgName}
                        onChange={(e) => setConfirmOrgName(e.target.value)}
                        placeholder={leaveOrgDialog?.orgName}
                        className="text-base"
                      />
                      <p className="text-xs text-muted-foreground">
                        Please type <span className="font-medium">{leaveOrgDialog?.orgName}</span> to confirm
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLeaveOrgDialog(null);
                      setConfirmOrgName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleLeaveOrg}
                    disabled={!confirmOrgName || confirmOrgName !== leaveOrgDialog?.orgName}
                    className="gap-2"
                  >
                    <UserMinus className="w-4 h-4" />
                    Leave Organization
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Create Organization Dialog */}
            <Dialog open={isCreatingOrg} onOpenChange={setIsCreatingOrg}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Create a new organization and invite team members
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="bg-muted p-4 rounded-lg space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        <AvatarImage 
                          src={newOrgData.avatar ? URL.createObjectURL(newOrgData.avatar) : undefined}
                        />
                        <AvatarFallback>
                          {newOrgData.name ? newOrgData.name.slice(0, 2).toUpperCase() : <Building2 className="h-8 w-8" />}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">Organization Picture</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Add a logo or image to represent your organization
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => document.getElementById('new-org-avatar')?.click()}
                          className="w-[140px]"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Upload Image
                        </Button>
                      </div>
                    </div>
                    <input
                      type="file"
                      id="new-org-avatar"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setNewOrgData(prev => ({ ...prev, avatar: file }))
                        }
                      }}
                    />
                    <div className="text-[13px] text-muted-foreground flex items-center gap-1">
                      <InfoIcon className="w-3 h-3" />
                      <span>JPG, GIF or PNG. Max size of 2MB.</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-org-name">Organization Name</Label>
                      <Input
                        id="new-org-name"
                        placeholder="Enter organization name"
                        value={newOrgData.name}
                        onChange={(e) => setNewOrgData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-org-pin">Security PIN</Label>
                      <Input
                        id="new-org-pin"
                        placeholder="Enter 4-digit PIN"
                        value={newOrgData.pin}
                        onChange={(e) => {
                          // Only allow numbers and limit to 4 digits
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                          setNewOrgData(prev => ({ ...prev, pin: value }))
                        }}
                        type="password"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="text-lg tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground">
                        This PIN will be required for sensitive organization actions
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <h4 className="font-medium">Security PIN</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your organization PIN will be required for:
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Removing members</li>
                      <li>Changing member roles</li>
                      <li>Deleting organization resources</li>
                    </ul>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <h4 className="font-medium">Owner Privileges</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      As the owner, you'll have full control over the organization, including managing members, settings, and security preferences.
                    </p>
                  </div>
                </div>
                <DialogFooter className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCreatingOrg(false)
                      setNewOrgData({
                        name: '',
                        avatar: null,
                        pin: ''
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateOrg}
                    disabled={!newOrgData.name.trim() || newOrgData.pin.length !== 4}
                  >
                    Create Organization
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Add Delete Organization Dialog */}
            <Dialog 
              open={deleteOrgDialog?.isOpen} 
              onOpenChange={(open) => {
                if (!open) {
                  setDeleteOrgDialog(null);
                  setDeleteOrgPin('');
                  setDeleteOrgConfirmName('');
                }
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={organizations.find(org => org.id === deleteOrgDialog?.orgId)?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {deleteOrgDialog?.orgName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl text-destructive">Delete Organization</DialogTitle>
                      <DialogDescription className="mt-1">
                        This action cannot be undone
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="mt-6">
                  <div className="space-y-4">
                    <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
                      <h4 className="font-medium text-sm text-destructive">Warning:</h4>
                      <p className="text-sm text-destructive">
                        Deleting this organization will:
                      </p>
                      <ul className="text-sm text-destructive list-disc list-inside space-y-1">
                        <li>Remove all members</li>
                        <li>Delete all organization data</li>
                        <li>Cancel any active subscriptions</li>
                        <li>This action is permanent and cannot be undone</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="delete-org-name" className="text-sm font-medium">
                        Type organization name to confirm
                      </Label>
                      <Input
                        id="delete-org-name"
                        value={deleteOrgConfirmName}
                        onChange={(e) => setDeleteOrgConfirmName(e.target.value)}
                        placeholder={deleteOrgDialog?.orgName}
                      />
                      <p className="text-xs text-muted-foreground">
                        Please type <span className="font-medium">{deleteOrgDialog?.orgName}</span> to confirm
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="delete-pin" className="text-sm font-medium">
                        Enter Organization PIN
                      </Label>
                      <Input
                        id="delete-pin"
                        type="password"
                        value={deleteOrgPin}
                        onChange={(e) => {
                          // Only allow numbers and limit to 4 digits
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                          setDeleteOrgPin(value)
                        }}
                        placeholder="Enter 4-digit PIN"
                        maxLength={4}
                        pattern="[0-9]*"
                        inputMode="numeric"
                        className="text-lg tracking-widest"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your organization's security PIN to confirm deletion
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-6 gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteOrgDialog(null);
                      setDeleteOrgPin('');
                      setDeleteOrgConfirmName('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteOrg}
                    disabled={
                      !deleteOrgDialog ||
                      !deleteOrgPin ||
                      deleteOrgPin.length !== 4 ||
                      !deleteOrgConfirmName ||
                      deleteOrgConfirmName !== deleteOrgDialog.orgName
                    }
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Organization
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </main>
    </div>
  )
}
