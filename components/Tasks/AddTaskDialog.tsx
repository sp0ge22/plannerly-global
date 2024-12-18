import { useState, ReactNode, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { motion } from 'framer-motion'
import { Plus, Wand2, Loader2,  } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { Task } from '@/types/task'
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Crown, Shield, User } from "lucide-react"

type Tenant = {
  id: string
  name: string
  avatar_url?: string | null
  is_owner: boolean
  is_admin: boolean
}

type UserTenantResponse = {
  tenant_id: string
  is_owner: boolean
  is_admin: boolean
  tenants: {
    id: string
    name: string
    avatar_url: string | null
  }
}

type OrgUser = {
  user_id: string
  profile: {
    name: string | null
    email: string | null
    avatar_url: string | null
  }
}

type AddTaskDialogProps = {
  addTask: (task: Omit<Task, 'id' | 'comments' | 'created_at'>) => Promise<boolean>
  children: ReactNode
}

export function AddTaskDialog({ addTask, children }: AddTaskDialogProps) {
  const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'comments' | 'created_at'>>({
    title: '',
    body: '',
    assignee: '',
    status: 'To Do',
    priority: 'Medium',
    due: null,
    archived: false,
    tenant_id: ''
  })
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([])
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false)
  const [isSummarizingDescription, setIsSummarizingDescription] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (isOpen) {
      const fetchTenants = async () => {
        const { data: userTenants, error } = await supabase
          .from('user_tenants')
          .select(`
            tenant_id,
            is_owner,
            is_admin,
            tenants:tenant_id (
              id,
              name,
              avatar_url
            )
          `)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .returns<UserTenantResponse[]>()

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
            avatar_url: ut.tenants.avatar_url || undefined,
            is_owner: ut.is_owner,
            is_admin: ut.is_admin
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

        setTenants(fetchedTenants)
        if (fetchedTenants.length > 0) {
          setNewTask(prev => ({ ...prev, tenant_id: fetchedTenants[0].id }))
        }
      }

      fetchTenants()
    }
  }, [isOpen, supabase])

  useEffect(() => {
    const fetchOrgUsers = async () => {
      if (!newTask.tenant_id) return

      // First get user_ids from user_tenants
      const { data: userTenants, error: userTenantsError } = await supabase
        .from('user_tenants')
        .select('user_id')
        .eq('tenant_id', newTask.tenant_id)

      if (userTenantsError) {
        console.error('Error fetching organization users:', userTenantsError)
        toast({
          title: "Error fetching users",
          description: "Could not load organization users.",
          variant: "destructive",
        })
        return
      }

      if (!userTenants?.length) {
        setOrgUsers([])
        return
      }

      // Then get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userTenants.map(ut => ut.user_id))

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError)
        toast({
          title: "Error fetching users",
          description: "Could not load user profiles.",
          variant: "destructive",
        })
        return
      }

      const users: OrgUser[] = profiles.map(profile => ({
        user_id: profile.id,
        profile: {
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url
        }
      }))

      setOrgUsers(users)
      
      // Set first user as default assignee if none selected
      if (!newTask.assignee && users.length > 0) {
        setNewTask(prev => ({ 
          ...prev, 
          assignee: users[0].profile.name || users[0].profile.email || users[0].user_id 
        }))
      }
    }

    fetchOrgUsers()
  }, [newTask.tenant_id, supabase])

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      'Low': 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      'Medium': 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      'High': 'bg-red-100 text-red-800 hover:bg-red-200'
    }
    return colors[priority]
  }

  const handleSummarize = async () => {
    if (!newTask.body.trim()) {
      toast({
        title: "No content to summarize",
        description: "Please enter some text before summarizing.",
        variant: "destructive",
      })
      return
    }

    setIsSummarizingDescription(true)
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newTask.body }),
      })

      if (!response.ok) throw new Error('Failed to summarize')

      const data = await response.json()
      setNewTask({ ...newTask, body: data.summary })
      toast({
        title: "Summary generated",
        description: "Task description has been summarized.",
      })
    } catch (error) {
      console.error('Error summarizing task:', error)
      toast({
        title: "Summarization failed",
        description: "There was an error summarizing the task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSummarizingDescription(false)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the task.",
        variant: "destructive",
      })
      return
    }

    if (!newTask.tenant_id) {
      toast({
        title: "Organization required",
        description: "Please select an organization for the task.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const success = await addTask(newTask)
      if (success) {
        setIsOpen(false)
        setNewTask({ 
          title: '', 
          body: '', 
          assignee: '', 
          status: 'To Do', 
          priority: 'Medium', 
          due: null,
          archived: false,
          tenant_id: tenants[0]?.id || ''
        })
        toast({
          title: "Task added successfully",
          description: "Your new task has been added to the list.",
        })
      } else {
        throw new Error('Failed to add task')
      }
    } catch (error) {
      console.error('Error adding task:', error)
      toast({
        title: "Failed to add task",
        description: "There was an error adding the task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearForm = () => {
    setNewTask({
      title: '',
      body: '',
      assignee: '',
      status: 'To Do',
      priority: 'Medium',
      due: null,
      archived: false,
      tenant_id: newTask.tenant_id // Preserve the current organization
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Task</DialogTitle>
          <DialogDescription className="text-gray-500">
            Create a new task and add it to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="tenant-select" className="text-sm font-medium">Organization</Label>
            <Select
              value={newTask.tenant_id}
              onValueChange={(value) => setNewTask({ ...newTask, tenant_id: value })}
            >
              <SelectTrigger id="tenant-select" className="w-full">
                <SelectValue placeholder="Select organization">
                  {newTask.tenant_id && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage 
                          src={tenants.find(t => t.id === newTask.tenant_id)?.avatar_url ?? undefined}
                        />
                        <AvatarFallback>
                          {(tenants.find(t => t.id === newTask.tenant_id)?.name || '??').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{tenants.find(t => t.id === newTask.tenant_id)?.name}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                          {tenants.find(t => t.id === newTask.tenant_id)?.is_owner && (
                            <>
                              <Crown className="w-3 h-3 text-yellow-500" />
                              Owner
                            </>
                          )}
                          {tenants.find(t => t.id === newTask.tenant_id)?.is_admin && !tenants.find(t => t.id === newTask.tenant_id)?.is_owner && (
                            <>
                              <Shield className="w-3 h-3 text-blue-500" />
                              Admin
                            </>
                          )}
                          {!tenants.find(t => t.id === newTask.tenant_id)?.is_owner && !tenants.find(t => t.id === newTask.tenant_id)?.is_admin && (
                            <>
                              <User className="w-3 h-3" />
                              Member
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={tenant.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {tenant.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{tenant.name}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-2">
                          {tenant.is_owner && (
                            <>
                              <Crown className="w-3 h-3 text-yellow-500" />
                              Owner
                            </>
                          )}
                          {tenant.is_admin && !tenant.is_owner && (
                            <>
                              <Shield className="w-3 h-3 text-blue-500" />
                              Admin
                            </>
                          )}
                          {!tenant.is_owner && !tenant.is_admin && (
                            <>
                              <User className="w-3 h-3" />
                              Member
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-title" className="text-sm font-medium">Title</Label>
            <Input
              id="new-title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Enter task title..."
              className="w-full"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                if (!newTask.body.trim()) {
                  toast({
                    title: "No content to summarize",
                    description: "Please enter description text before generating a title.",
                    variant: "destructive",
                  })
                  return
                }
                setIsGeneratingTitle(true)
                try {
                  const response = await fetch('/api/summarize-title', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: newTask.body }),
                  })
                  if (!response.ok) throw new Error('Failed to summarize')
                  const data = await response.json()
                  setNewTask({ ...newTask, title: data.summary })
                  toast({
                    title: "Title generated",
                    description: "Task title has been generated from description.",
                  })
                } catch (error) {
                  console.error('Error generating title:', error)
                  toast({
                    title: "Title generation failed",
                    description: "There was an error generating the title. Please try again.",
                    variant: "destructive",
                  })
                } finally {
                  setIsGeneratingTitle(false)
                }
              }}
              disabled={isGeneratingTitle || !newTask.body.trim()}
              className="transition-all duration-200 bg-secondary hover:bg-primary hover:text-secondary"
            >
              {isGeneratingTitle ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  <span>Generate Title</span>
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-body" className="text-sm font-medium">Description</Label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSummarize}
                disabled={isSummarizingDescription || !newTask.body.trim()}
                className="transition-all duration-200 bg-secondary hover:bg-primary hover:text-secondary"
              >
                {isSummarizingDescription ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Summarizing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    <span>Summarize Description</span>
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="new-body"
              value={newTask.body}
              onChange={(e) => setNewTask({ ...newTask, body: e.target.value })}
              className="min-h-[100px] max-h-[200px] resize-y"
              placeholder="Enter task details here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-status" className="text-sm font-medium">Status</Label>
              <Select
                value={newTask.status}
                onValueChange={(value: Task['status']) => setNewTask({ ...newTask, status: value })}
              >
                <SelectTrigger id="new-status" className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-priority" className="text-sm font-medium">Priority</Label>
              <Select
                value={newTask.priority}
                onValueChange={(value: Task['priority']) => setNewTask({ ...newTask, priority: value })}
              >
                <SelectTrigger id="new-priority" className="w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {['Low', 'Medium', 'High'].map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      <div className="flex items-center">
                        <Badge variant="secondary" className={`mr-2 ${getPriorityColor(priority as Task['priority'])}`}>
                          {priority}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-assignee" className="text-sm font-medium">Assignee</Label>
            <Select
              value={newTask.assignee}
              onValueChange={(value: string) => setNewTask({ ...newTask, assignee: value })}
            >
              <SelectTrigger id="new-assignee" className="w-full">
                <SelectValue placeholder="Select assignee">
                  {newTask.assignee && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage 
                          src={orgUsers.find(u => 
                            (u.profile.name === newTask.assignee || 
                             u.profile.email === newTask.assignee ||
                             u.user_id === newTask.assignee)
                          )?.profile.avatar_url ?? undefined} 
                        />
                        <AvatarFallback>
                          {newTask.assignee.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{newTask.assignee}</span>
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
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={user.profile.avatar_url ?? undefined} />
                        <AvatarFallback>
                          {(user.profile.name || user.profile.email || user.user_id)
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {user.profile.name || user.profile.email || user.user_id}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due-date" className="text-sm font-medium">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  id="due-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newTask.due ? format(new Date(newTask.due), "PPP") : <span>Set due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newTask.due ? new Date(newTask.due) : undefined}
                  onSelect={(date) => {
                    setNewTask({ 
                      ...newTask, 
                      due: date ? date.toISOString() : null 
                    });
                    // Close the popover after selection
                    const popoverElement = document.querySelector('[data-radix-popper-content-wrapper]');
                    if (popoverElement) {
                      const closeButton = popoverElement.querySelector('[aria-label="Close"]');
                      if (closeButton instanceof HTMLElement) {
                        closeButton.click();
                      }
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

        <DialogFooter className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleClearForm}
              disabled={isSubmitting}
            >
              Clear Form
            </Button>
          </div>
          <Button
            onClick={handleAddTask}
            disabled={isSubmitting || !newTask.title.trim()}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Adding...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
