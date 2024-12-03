'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from "@/hooks/use-toast"
import { Loader2, Shield } from 'lucide-react'
import { Database, Tables } from '@/types/supabase'
import { Checkbox } from "@/components/ui/checkbox"

interface UserWithPermissions extends Tables<'profiles'> {
  permissions: string[];
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserWithPermissions[]>([])
  const [assignees, setAssignees] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingPermission, setUpdatingPermission] = useState<{userId: string, assignee: string} | null>(null)
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  // Load users and their permissions
  const loadUsers = useCallback(async () => {
    try {
      console.log('Loading users...')
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const usersWithPermissions = await response.json()
      
      console.log('Users with permissions:', usersWithPermissions)
      setUsers(usersWithPermissions)
    } catch (error) {
      console.error('Error loading users:', error)
      toast({
        title: 'Error loading users',
        description: 'Failed to load user data',
        variant: 'destructive',
      })
    }
  }, [toast])

  // Load unique assignees from tasks
  const loadAssignees = useCallback(async () => {
    try {
      console.log('Loading assignees...')
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('assignee')
        .not('assignee', 'is', null)

      if (error) {
        console.error('Assignees error:', error)
        throw error
      }

      if (tasks) {
        const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignee)))
        console.log('Unique assignees:', uniqueAssignees)
        setAssignees(uniqueAssignees)
      }
    } catch (error) {
      console.error('Error loading assignees:', error)
    }
  }, [supabase])

  // Toggle permission for a user
  const togglePermission = async (userId: string, assignee: string) => {
    setUpdatingPermission({ userId, assignee })
    try {
      console.log('Toggling permission for user:', userId, 'assignee:', assignee)
      const user = users.find(u => u.id === userId)
      const hasPermission = user?.permissions.includes(assignee)

      const response = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          assignee,
          action: hasPermission ? 'remove' : 'add'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update permission')
      }

      await loadUsers()

      toast({
        title: 'Permission updated',
        description: `Permission ${hasPermission ? 'removed' : 'granted'} successfully`,
      })
    } catch (error) {
      console.error('Error toggling permission:', error)
      toast({
        title: 'Error updating permission',
        description: 'Failed to update permission',
        variant: 'destructive',
      })
    } finally {
      setUpdatingPermission(null)
    }
  }

  useEffect(() => {
    Promise.all([loadUsers(), loadAssignees()])
      .finally(() => setIsLoading(false))
  }, [loadUsers, loadAssignees])

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-blue-600" />
          User Permissions
        </h2>
        
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  {assignees.map(assignee => (
                    <th key={assignee} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {assignee}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={assignees.length + 1} className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={assignees.length + 1} className="px-6 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr 
                      key={user.id}
                      className={`
                        transition-colors hover:bg-gray-100
                        ${index % 2 === 0 ? 'bg-gray-50' : 'bg-gray-100'}
                      `}
                    >
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {user.email}
                      </td>
                      {assignees.map(assignee => (
                        <td key={`${user.id}-${assignee}`} className="px-6 py-4">
                          <Checkbox
                            checked={user.permissions.includes(assignee)}
                            onCheckedChange={() => togglePermission(user.id, assignee)}
                            disabled={updatingPermission?.userId === user.id && updatingPermission?.assignee === assignee}
                            className={`
                              transition-opacity
                              ${updatingPermission?.userId === user.id && updatingPermission?.assignee === assignee ? 'opacity-50' : ''}
                            `}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
