'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'

export function SettingsForm() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState('bg-red-600')
  const [avatarLetter, setAvatarLetter] = useState('U')
  const [uploading, setUploading] = useState(false)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    getProfile()
  }, [])

  async function getProfile() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, avatar_color, avatar_letter')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      setAvatarUrl(data.avatar_url)
      setAvatarColor(data.avatar_color)
      setAvatarLetter(data.avatar_letter)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Profile Picture</h2>
        <div className="flex items-center space-x-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl ?? undefined} />
            <AvatarFallback className={avatarColor}>
              {avatarLetter}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Button disabled={uploading} onClick={() => document.getElementById('avatar-upload')?.click()}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Change Avatar'
              )}
            </Button>
            <input
              type="file"
              id="avatar-upload"
              className="hidden"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
            />
            <p className="text-sm text-gray-500">
              Recommended: Square image, at least 100x100px
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 