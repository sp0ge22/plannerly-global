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
import { Plus, Search, Loader2, Filter, RefreshCcw, Calendar, Archive, ArchiveRestore } from 'lucide-react'
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { sortTasks } from './TaskGrid' // Ensure this import is correct
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArchivedTaskCard } from './ArchivedTaskCard'

export function DashboardComponent() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
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
    const matchesArchiveStatus = task.archived === showArchived

    return matchesSearch && matchesPriority && matchesAssignee && matchesArchiveStatus
  }))

  const statusColumns = ['To Do', 'In Progress', 'Done']
  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignee)))

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center space-x-2 min-w-[200px]">
              <Filter className="w-4 h-4 text-gray-400" />
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {uniqueAssignees.map(assignee => (
                    <SelectItem key={assignee} value={assignee}>
                      {assignee}
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
            {filterPriority !== 'all' || filterAssignee !== 'all' || searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setFilterPriority('all')
                  setFilterAssignee('all')
                }}
              >
                Clear filters
              </Button>
            )}
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
