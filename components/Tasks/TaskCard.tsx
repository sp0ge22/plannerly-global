import { useState } from 'react';
import { Task } from '@/types/task';
import { TaskDetailsDialog } from './TaskDetailsDialog';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar, Clock, AlertCircle, Flag, UserCircle, Archive, ArchiveRestore } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formatDate = (dateString: string) => {
  try {
    // Parse the PostgreSQL timestamp
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString)
      return 'Date unavailable'
    }
    
    // Format for display
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
  
  // Set both dates to midnight for accurate day comparison
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

type TaskCardProps = {
  task: Task;
  updateTask: (task: Task) => void;
  addComment: (taskId: number, comment: string) => Promise<void>; // Ensure return type is Promise<void>
  deleteTask: (taskId: number, pin: string) => Promise<boolean>;
  toggleArchive: (taskId: number, archived: boolean) => Promise<void>;
};

export function TaskCard({
  task,
  updateTask,
  addComment,
  deleteTask,
  toggleArchive,
}: TaskCardProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pin, setPin] = useState('');

  const handleDelete = async () => {
    const success = await deleteTask(task.id, pin);
    if (success) {
      setIsDeleteDialogOpen(false);
      setPin('');
    }
  };

  return (
    <>
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
                  <span className="flex items-center">
                    <UserCircle className="w-4 h-4 mr-1" />
                    {task.assignee}
                  </span>
                  <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-xs px-2 py-0.5 flex items-center`}>
                    <Flag className="w-3 h-3 mr-1" />
                    {task.priority}
                  </Badge>
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
                      toggleArchive(task.id, !task.archived);
                    }}
                    title={task.archived ? "Restore task" : "Archive task"}
                    className="h-8 w-8"
                  >
                    {task.archived ? (
                      <ArchiveRestore className="w-4 h-4" />
                    ) : (
                      <Archive className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDeleteDialogOpen(true);
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Task
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="mb-6 space-y-2">
              <p className="font-medium">Are you sure you want to delete this task?</p>
              <p className="text-sm text-muted-foreground">
                &ldquo;{task.title}&rdquo;
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pin">Enter your PIN to confirm:</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="max-w-[200px]"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setPin('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!pin}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
