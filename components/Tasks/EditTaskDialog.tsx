import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Task } from '@/types/task'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from 'next/navigation'

type EditTaskDialogProps = {
  task: Task
  updateTask: (task: Task) => void
}

export function EditTaskDialog({ task, updateTask }: EditTaskDialogProps) {
  const [editingTask, setEditingTask] = useState<Task>(task)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [orgUsers, setOrgUsers] = useState<Array<{
    user_id: string
    profile: {
      name: string | null
      email: string | null
      avatar_url: string | null
    }
  }>>([])
  const supabase = createClientComponentClient()
  const router = useRouter()

  // Fetch organization users when dialog opens
  const fetchOrgUsers = async () => {
    try {
      // First get user_ids from user_tenants
      const { data: userTenants, error: userTenantsError } = await supabase
        .from('user_tenants')
        .select('user_id')
        .eq('tenant_id', task.tenant_id)

      if (userTenantsError) throw userTenantsError

      if (!userTenants?.length) {
        setOrgUsers([])
        return
      }

      // Then get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userTenants.map(ut => ut.user_id))

      if (profilesError) throw profilesError

      const users = profiles.map(profile => ({
        user_id: profile.id,
        profile: {
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url
        }
      }))

      setOrgUsers(users)
    } catch (error) {
      console.error('Error fetching organization users:', error)
    }
  }

  const handleSave = async () => {
    try {
      // Get the assignee's profile data
      const assigneeProfile = orgUsers.find(user => 
        user.profile.name === editingTask.assignee || 
        user.profile.email === editingTask.assignee
      )?.profile

      // Create a new task object that carefully preserves all original data
      const updatedTask = {
        ...task,  // Start with all original task data
        // Only update the specific fields that were edited
        title: editingTask.title,
        body: editingTask.body,
        status: editingTask.status,
        assignee: editingTask.assignee,
        // If assignee changed, update the avatar URL, otherwise keep the original
        assignee_avatar_url: editingTask.assignee !== task.assignee 
          ? (assigneeProfile?.avatar_url ?? task.assignee_avatar_url)
          : task.assignee_avatar_url,
        // Explicitly preserve these fields to ensure they're not lost
        tenant_id: task.tenant_id,
        tenant_name: task.tenant_name,
        tenant_avatar_url: task.tenant_avatar_url,
        id: task.id,
        comments: task.comments,
        created_at: task.created_at,
        due: task.due,
        priority: task.priority,
        archived: task.archived
      }

      await updateTask(updatedTask)
      router.refresh()
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  const handleSummarize = async () => {
    setIsSummarizing(true)
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: editingTask.body }),
      })

      if (!response.ok) {
        throw new Error('Failed to summarize')
      }

      const data = await response.json()
      setEditingTask({ ...editingTask, body: data.summary })
    } catch (error) {
      console.error('Error summarizing task:', error)
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <Dialog onOpenChange={(open) => {
      if (open) {
        fetchOrgUsers()
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Make changes to the task here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editingTask.title}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={editingTask.body}
              onChange={(e) => setEditingTask({ ...editingTask, body: e.target.value })}
              className="min-h-[200px]"
            />
            <Button onClick={handleSummarize} disabled={isSummarizing}>
              {isSummarizing ? 'Summarizing...' : 'Summarize with ChatGPT'}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={editingTask.status}
              onValueChange={(value: Task['status']) => setEditingTask({ ...editingTask, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="To Do">To Do</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              value={editingTask.assignee}
              onValueChange={(value: string) => setEditingTask({ ...editingTask, assignee: value })}
            >
              <SelectTrigger>
                <SelectValue>
                  {editingTask.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage 
                          src={orgUsers.find(u => 
                            u.profile.name === editingTask.assignee || 
                            u.profile.email === editingTask.assignee
                          )?.profile.avatar_url ?? undefined} 
                        />
                        <AvatarFallback>
                          {editingTask.assignee.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{editingTask.assignee}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {orgUsers.map((user) => (
                  <SelectItem 
                    key={user.user_id} 
                    value={user.profile.name || user.profile.email || user.user_id}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.profile.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(user.profile.name || user.profile.email || user.user_id)
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.profile.name || user.profile.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
