'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Task } from '@/types/task'
import { AddTaskDialog } from './AddTaskDialog'
import { StatusColumn } from './StatusColumn'
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, Filter, RefreshCcw, Calendar, Archive, ArchiveRestore, Crown, Shield, User } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { sortTasks } from './TaskGrid' // Ensure this import is correct
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArchivedTaskCard } from './ArchivedTaskCard'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export function DashboardComponent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterTenant, setFilterTenant] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  const [currentDate] = useState(new Date())
  const supabase = createClientComponentClient()
  const [showArchived, setShowArchived] = useState(false)

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks')
      const data = await response.json()
      const tasksWithComments = data.map((task: Task) => ({
        ...task,
        comments: task.comments || []
      }))
      setTasks(tasksWithComments)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast({
        title: "Failed to fetch tasks",
        description: "There was an error loading your tasks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks]);

  const refreshTasks = async () => {
    setIsRefreshing(true)
    await fetchTasks()
    setIsRefreshing(false)
    toast({
      title: "Tasks refreshed",
      description: "Your task list has been updated.",
    })
  }

  const addTask = async (task: Omit<Task, 'id' | 'comments' | 'created_at'>): Promise<boolean> => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      })
      
      if (!response.ok) throw new Error('Failed to add task')

      const newTask = await response.json()
      const taskWithComments = { 
        ...newTask, 
        comments: newTask.comments || []
      }
      setTasks(prev => [...prev, taskWithComments])
      toast({
        title: "Task added successfully",
        description: "Your new task has been created.",
      })
      return true
    } catch (error) {
      console.error('Error adding task:', error)
      toast({
        title: "Failed to add task",
        description: "There was an error creating your task. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const updateTask = async (updatedTask: Task) => {
    try {
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTask),
      })

      if (!response.ok) throw new Error('Failed to update task')

      const updatedTaskData = await response.json()
      setTasks(prev => prev.map(task => 
        task.id === updatedTaskData.id ? updatedTaskData : task
      ))
      
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      })
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Failed to update task",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      })
    }
  }

  const addComment = async (taskId: number, comment: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', session.user.id)
        .single()

      const authorName = profile?.name || 'Anonymous'

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: comment, author: authorName }),
      })

      if (!response.ok) throw new Error('Failed to add comment')

      const newComment = await response.json()
      
      // Update tasks with the new comment including profile data
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              comments: [...(task.comments || []), {
                ...newComment,
                profile: {
                  name: profile?.name,
                  avatar_url: profile?.avatar_url
                }
              }]
            }
          : task
      ))
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Failed to add comment",
        description: "There was an error posting your comment. Please try again.",
        variant: "destructive",
      })
    }
  }

  const deleteTask = async (taskId: number, pin: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!response.ok) throw new Error('Failed to delete task')

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast({
        title: "Task deleted",
        description: "The task has been removed from your list.",
      })
      return true
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: "Failed to delete task",
        description: "There was an error deleting the task. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }

  const toggleArchive = async (taskId: number, archived: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived }),
      })

      if (!response.ok) throw new Error('Failed to update task')

      const data = await response.json()
      console.log('Received task data:', data)
      
      // Map the returned data to include tenant and assignee information
      const updatedTask = {
        ...data,
        tenant_name: data.tenant_name || data.tenant?.name,
        tenant_avatar_url: data.tenant_avatar_url || data.tenant?.avatar_url,
        assignee: data.assignee,
        assignee_id: data.assignee_id,
        assignee_avatar_url: data.assignee_avatar_url,
        comments: data.comments || []
      }

      console.log('Updated task data:', updatedTask)

      setTasks(prev => {
        const newTasks = prev.map(task => 
          task.id === updatedTask.id ? updatedTask : task
        )
        console.log('New tasks state:', newTasks)
        return newTasks
      })

      toast({
        title: archived ? "Task archived" : "Task restored",
        description: archived 
          ? "The task has been moved to archives." 
          : "The task has been restored to the active list.",
      })
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: "Failed to update task",
        description: "There was an error updating the task. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredTasks = sortTasks(tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.body.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    const matchesAssignee = filterAssignee === 'all' || task.assignee === filterAssignee
    const matchesTenant = filterTenant === 'all' || task.tenant_id === filterTenant
    const matchesArchiveStatus = task.archived === showArchived

    return matchesSearch && matchesPriority && matchesAssignee && matchesTenant && matchesArchiveStatus
  }))

  const statusColumns = ['To Do', 'In Progress', 'Done']
  // First get unique assignee names, then map to objects with avatar URLs
  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignee)))
    .map(assigneeName => {
      const task = tasks.find(t => t.assignee === assigneeName)
      return {
        name: assigneeName,
        avatar_url: task?.assignee_avatar_url
      }
    })
    .filter(assignee => assignee.name)
    .sort((a, b) => a.name.localeCompare(b.name))

  // Get user's roles in organizations
  const [userOrgRoles, setUserOrgRoles] = useState<Record<string, { is_owner: boolean; is_admin: boolean }>>({})

  useEffect(() => {
    const fetchUserRoles = async () => {
      const { data: userTenants, error } = await supabase
        .from('user_tenants')
        .select('tenant_id, is_owner, is_admin')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

      if (!error && userTenants) {
        const roles = userTenants.reduce((acc, ut) => ({
          ...acc,
          [ut.tenant_id]: { is_owner: ut.is_owner, is_admin: ut.is_admin }
        }), {} as Record<string, { is_owner: boolean; is_admin: boolean }>)
        setUserOrgRoles(roles)
      }
    }

    fetchUserRoles()
  }, [supabase])

  const uniqueTenants = Array.from(new Set(tasks.map(task => task.tenant_id)))
    .map(tenantId => {
      const task = tasks.find(t => t.tenant_id === tenantId)
      const role = userOrgRoles[tenantId || '']
      return task ? {
        id: task.tenant_id,
        name: task.tenant_name || 'Unknown Organization',
        avatar_url: task.tenant_avatar_url || undefined,
        is_owner: role?.is_owner || false,
        is_admin: role?.is_admin || false
      } : null
    })
    .filter((tenant): tenant is { 
      id: string; 
      name: string; 
      avatar_url: string | undefined;
      is_owner: boolean;
      is_admin: boolean;
    } => Boolean(tenant))
    .sort((a, b) => {
      // Sort by role priority: owner -> admin -> member
      if (a.is_owner !== b.is_owner) return a.is_owner ? -1 : 1
      if (a.is_admin !== b.is_admin) return a.is_admin ? -1 : 1
      // If same role level, sort alphabetically by name
      return a.name.localeCompare(b.name)
    })

  return (
    <motion.main
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto py-8 px-4"
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Task Dashboard</h1>
            <div className="flex items-center mt-2 text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              <span>{currentDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setShowArchived(!showArchived)
                await refreshTasks()
              }}
            >
              {showArchived ? (
                <>
                  <ArchiveRestore className="w-4 h-4 mr-1" />
                  Show Active Tasks
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-1" />
                  Show Archived Tasks
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTasks}
              disabled={isRefreshing}
            >
              <RefreshCcw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <AddTaskDialog addTask={addTask}>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Task
              </Button>
            </AddTaskDialog>
          </div>
        </div>

        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
            <div className="relative w-[400px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-4 flex-1">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={filterTenant} onValueChange={setFilterTenant}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue>
                    {filterTenant === 'all' ? (
                      <span>All Organizations</span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={uniqueTenants.find(t => t.id === filterTenant)?.avatar_url}
                          />
                          <AvatarFallback>
                            {(uniqueTenants.find(t => t.id === filterTenant)?.name || '??').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const tenant = uniqueTenants.find(t => t.id === filterTenant)
                            return (
                              <>
                                <span className="truncate">
                                  {tenant?.name}
                                </span>
                                {tenant?.is_owner && (
                                  <Crown className="w-3 h-3 text-yellow-500" />
                                )}
                                {!tenant?.is_owner && tenant?.is_admin && (
                                  <Shield className="w-3 h-3 text-blue-500" />
                                )}
                                {!tenant?.is_owner && !tenant?.is_admin && (
                                  <User className="w-3 h-3" />
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {uniqueTenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={tenant.avatar_url} />
                          <AvatarFallback>
                            {tenant.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{tenant.name}</span>
                          {tenant.is_owner && (
                            <Crown className="w-3 h-3 text-yellow-500" />
                          )}
                          {!tenant.is_owner && tenant.is_admin && (
                            <Shield className="w-3 h-3 text-blue-500" />
                          )}
                          {!tenant.is_owner && !tenant.is_admin && (
                            <User className="w-3 h-3" />
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    {filterPriority === 'all' ? 'All Priorities' : filterPriority}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue>
                    {filterAssignee === 'all' ? (
                      <span>All Assignees</span>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage 
                            src={uniqueAssignees.find(a => a.name === filterAssignee)?.avatar_url ?? undefined}
                          />
                          <AvatarFallback>
                            {filterAssignee.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{filterAssignee}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {uniqueAssignees.map((assignee) => (
                    <SelectItem key={assignee.name} value={assignee.name}>
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={assignee.avatar_url ?? undefined} />
                          <AvatarFallback>
                            {assignee.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{assignee.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Total: {tasks.length}</span>
              <Badge variant="outline">{filteredTasks.length} matches</Badge>
            </div>
            <div className="min-w-[100px] flex justify-end">
              {(filterPriority !== 'all' || 
                filterAssignee !== 'all' || 
                filterTenant !== 'all' || 
                searchQuery) ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterPriority('all')
                    setFilterAssignee('all')
                    setFilterTenant('all')
                  }}
                  className="font-medium"
                >
                  Clear filters
                </Button>
              ) : (
                <div className="h-9" />
              )}
            </div>
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-64 space-y-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-lg font-medium">Loading tasks...</p>
            </motion.div>
          ) : showArchived ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {filteredTasks
                .sort((a, b) => new Date(b.due || b.created_at).getTime() - new Date(a.due || a.created_at).getTime())
                .map((task) => (
                  <ArchivedTaskCard
                    key={task.id}
                    task={task}
                    updateTask={updateTask}
                    addComment={addComment}
                    deleteTask={deleteTask}
                    toggleArchive={toggleArchive}
                  />
                ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {statusColumns.map((status) => (
                <StatusColumn
                  key={status}
                  title={status}
                  tasks={filteredTasks.filter(task => task.status === status)}
                  updateTask={updateTask}
                  addComment={addComment}
                  deleteTask={deleteTask}
                  toggleArchive={toggleArchive}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  )
}
