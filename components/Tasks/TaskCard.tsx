import { useState } from 'react';
import { Task } from '@/types/task';
import { TaskDetailsDialog } from './TaskDetailsDialog';
import { Button } from '@/components/ui/button';
import { Trash2, Calendar, Clock, AlertCircle, Flag, UserCircle, Archive, ArchiveRestore, Building2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

  // Add debug logging
  console.log('Task assignee data:', {
    assignee: task.assignee,
    assignee_avatar_url: task.assignee_avatar_url,
    assignee_id: task.assignee_id
  });

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
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={task.tenant_avatar_url ?? undefined} />
                <AvatarFallback>
                  {(task.tenant_name || 'Unknown').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">Confirm Deletion</DialogTitle>
                <DialogDescription className="mt-1">
                  Enter {task.tenant_name}'s PIN to delete this task
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-6">
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Task to Delete:</h4>
                <p className="text-sm text-muted-foreground">{task.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={task.assignee_avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>Assigned to {task.assignee}</span>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="pin" className="text-sm font-medium">
                  Organization PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Contact your organization owner if you don't know the PIN
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button
              variant="outline"
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
              disabled={!pin.trim() || pin.length !== 4}
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
