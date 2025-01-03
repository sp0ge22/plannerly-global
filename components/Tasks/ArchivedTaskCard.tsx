import { Task } from '@/types/task'
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Calendar, Clock, AlertCircle, Flag, Archive, ArchiveRestore, Building2 } from 'lucide-react'
import { TaskDetailsDialog } from './TaskDetailsDialog'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// Reuse the same helper functions from TaskCard
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString)
      return 'Date unavailable'
    }
    
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    
    return date.toLocaleString('en-US', options)
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Date unavailable'
  }
}

const getDueStatus = (dueDate: string | null, status: string) => {
  if (!dueDate || status === 'Done') return null;
  
  const now = new Date();
  const due = new Date(dueDate);
  
  if (isNaN(due.getTime())) return null;
  
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays === 2) {
    return 'Due soon';
  } else {
    return `Due in ${diffDays} days`;
  }
}

const getPriorityColor = (priority: Task['priority']) => {
  const colors = {
    'Low': 'bg-gray-100 text-gray-800',
    'Medium': 'bg-orange-100 text-orange-800',
    'High': 'bg-red-100 text-red-800'
  }
  return colors[priority]
}

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
  deleteTask,
  toggleArchive,
}: ArchivedTaskCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pt-6">
        <TaskDetailsDialog
          task={task}
          updateTask={updateTask}
          addComment={addComment}
        >
          <div className="cursor-pointer">
            <h3 className="font-semibold mb-2">{task.title}</h3>
            <div className="flex flex-col space-y-2 mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center space-x-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee_avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {task.assignee.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{task.assignee}</span>
                </span>
                <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-xs px-2 py-0.5 flex items-center`}>
                  <Flag className="w-3 h-3 mr-1" />
                  {task.priority}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.tenant_avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {(task.tenant_name || 'Unknown Organization').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{task.tenant_name || 'Unknown Organization'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex flex-col bg-gray-50 p-2 rounded">
                  <span className="flex items-center text-gray-500 mb-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    Created
                  </span>
                  <span className="font-medium">{formatDate(task.created_at)}</span>
                </div>
                {task.due && (
                  <div className="flex flex-col bg-gray-50 p-2 rounded">
                    <span className="flex items-center text-gray-500 mb-1">
                      <Clock className="w-3 h-3 mr-1" />
                      Due
                    </span>
                    <span className="font-medium">{formatDate(task.due)}</span>
                  </div>
                )}
              </div>
              {getDueStatus(task.due, task.status) && (
                <Badge 
                  variant="destructive" 
                  className="text-xs flex items-center justify-center w-full"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {getDueStatus(task.due, task.status)}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div
                className={`text-xs font-medium px-2 py-1 rounded-full inline-block
                  ${
                    task.status === 'To Do'
                      ? 'bg-yellow-100 text-yellow-800'
                      : task.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
              >
                {task.status}
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {(task.comments || []).length} comments
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleArchive(task.id, false);
                  }}
                  title="Restore task"
                  className="h-8 w-8"
                >
                  <ArchiveRestore className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTask(task.id, '');
                  }}
                  className="h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </TaskDetailsDialog>
      </CardHeader>
    </Card>
  )
} 