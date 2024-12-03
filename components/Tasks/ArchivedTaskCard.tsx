import { Task } from '@/types/task'
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArchiveRestore, Calendar, Clock, Flag, UserCircle } from 'lucide-react'
import { format } from 'date-fns'
import { TaskDetailsDialog } from './TaskDetailsDialog'

type ArchivedTaskCardProps = {
  task: Task
  updateTask: (task: Task) => void
  addComment: (taskId: number, comment: string) => Promise<void>
  deleteTask: (taskId: number, pin: string) => Promise<boolean>
  toggleArchive: (taskId: number, archived: boolean) => Promise<void>
}

export function ArchivedTaskCard({
  task,
  updateTask,
  addComment,
  toggleArchive,
}: ArchivedTaskCardProps) {
  const formatDate = (date: string | null) => {
    if (!date) return 'No date'
    return format(new Date(date), 'MMM d, yyyy')
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-orange-100 text-orange-800',
      'High': 'bg-red-100 text-red-800'
    }
    return colors[priority]
  }

  const getStatusColor = (status: Task['status']) => {
    return status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <Card className="w-full bg-gray-50/50 hover:bg-gray-50 transition-colors">
      <CardHeader>
        <TaskDetailsDialog
          task={task}
          updateTask={updateTask}
          addComment={addComment}
        >
          <div className="cursor-pointer">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-medium mb-2">{task.title}</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <UserCircle className="w-4 h-4 mr-1" />
                      {task.assignee}
                    </span>
                    <Badge variant="outline" className={getPriorityColor(task.priority)}>
                      <Flag className="w-3 h-3 mr-1" />
                      {task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(task.created_at)}
                    </span>
                    {task.due && (
                      <span className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(task.due)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`text-xs font-medium px-2 py-1 rounded-full inline-block
                        ${getStatusColor(task.status)}`}
                    >
                      {task.status}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {(task.comments || []).length} comments
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleArchive(task.id, false);
                        }}
                      >
                        <ArchiveRestore className="w-4 h-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TaskDetailsDialog>
      </CardHeader>
    </Card>
  )
} 