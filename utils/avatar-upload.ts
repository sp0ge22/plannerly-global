import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { v4 as uuidv4 } from 'uuid'

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClientComponentClient()
  
  try {
    // Get file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    // Generate unique filename
    const fileName = `${uuidv4()}.${fileExt}`

    // Delete old avatar if exists
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not authenticated')

    const { data: profileData } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', session.user.id)
      .single()

    if (profileData?.avatar_url) {
      const oldFileName = profileData.avatar_url.split('/').pop()
      if (oldFileName) {
        await supabase.storage
          .from('avatars')
          .remove([oldFileName])
          .catch(console.error) // Don't throw if delete fails
      }
    }

    // Upload new avatar
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type // Add content type
      })

    if (uploadError || !data) {
      throw uploadError || new Error('Upload failed')
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Error in uploadAvatar:', error)
    throw error
  }
}
