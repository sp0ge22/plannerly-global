import { useState, ReactNode, useEffect, useRef, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserCircle, Calendar, MessageSquare, Send, Clock, Edit2, X, Loader2, Wand2, User } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Task, Comment } from '@/types/task'
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface TaskDetailsDialogProps {
  task: Task
  updateTask: (task: Task) => void
  addComment: (taskId: number, comment: string) => Promise<void>
  children: ReactNode
}

const formatTextWithLinks = (text: string) => {
  // Regex for matching URLs (http, https, or www)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;
  
  return text.split(urlRegex).map((part, i) => {
    if (part?.match(urlRegex)) {
      const href = part.startsWith('www.') ? `https://${part}` : part;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

export function TaskDetailsDialog({ task, updateTask, addComment, children }: TaskDetailsDialogProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingTask, setEditingTask] = useState<Task>(task)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const { toast } = useToast()
  const scrollViewportRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setEditingTask(task)
  }, [task])

  // Scroll to bottom when comments change
  useEffect(() => {
    if (scrollViewportRef.current) {
      const scrollTimeout = setTimeout(() => {
        scrollViewportRef.current?.scrollTo({
          top: scrollViewportRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100) // Small delay to ensure content is rendered

      return () => clearTimeout(scrollTimeout)
    }
  }, [task.comments])

  const getStatusColor = (status: Task['status']) => {
    const colors = {
      'To Do': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'In Progress': 'bg-blue-100 text-blue-800 border-blue-300',
      'Done': 'bg-green-100 text-green-800 border-green-300'
    }
    return colors[status]
  }

  const getPriorityColor = (priority: Task['priority']) => {
    const colors = {
      'Low': 'bg-gray-100 text-gray-800',
      'Medium': 'bg-orange-100 text-orange-800',
      'High': 'bg-red-100 text-red-800'
    }
    return colors[priority]
  }

  const scrollToBottom = useCallback(() => {
    if (scrollViewportRef.current) {
      const scrollTimeout = setTimeout(() => {
        scrollViewportRef.current?.scrollTo({
          top: scrollViewportRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 100) // Small delay to ensure content is rendered

      return () => clearTimeout(scrollTimeout)
    }
  }, [])

  // Scroll when dialog opens or comments change
  useEffect(() => {
    if (isOpen) {
      // Immediate scroll
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight
      }
      
      // Followed by smooth scroll after a very short delay to ensure content is rendered
      const scrollTimeout = setTimeout(() => {
        if (scrollViewportRef.current) {
          scrollViewportRef.current.scrollTo({
            top: scrollViewportRef.current.scrollHeight,
            behavior: 'smooth'
          })
        }
      }, 50) // Reduced delay to 50ms

      return () => clearTimeout(scrollTimeout)
    }
  }, [isOpen])

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    setIsSubmitting(true)
    try {
      await addComment(task.id, newComment)
      setNewComment('')
      scrollToBottom() // Scroll after adding comment
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSave = () => {
    updateTask(editingTask)
    setIsEditing(false)
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

      if (!response.ok) throw new Error('Failed to summarize')
      const data = await response.json()
      setEditingTask({ ...editingTask, body: data.summary })
    } catch (error) {
      console.error('Error summarizing task:', error)
    } finally {
      setIsSummarizing(false)
    }
  }

  const formatDate = (date: string) => {
    return format(new Date(date), 'MM/dd/yyyy')
  }

  const getDueStatus = (due: string | null) => {
    if (!due) return null;
    const dueDate = new Date(due);
    const now = new Date();
    
    // Set both dates to midnight for accurate day comparison
    now.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'Overdue';
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

  const handleDialogClose = () => {
    if (isEditing && (editingTask.title !== task.title || editingTask.body !== task.body)) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return;
      }
    }
    setIsEditing(false);
  }

  const handleStatusChange = (newStatus: Task['status']) => {
    const updatedTask = { ...task, status: newStatus };
    updateTask(updatedTask);
  };

  const handlePriorityChange = (newPriority: Task['priority']) => {
    const updatedTask = { ...task, priority: newPriority };
    updateTask(updatedTask);
  };

  return (
    <Dialog onOpenChange={(open) => {
      setIsOpen(open)
      handleDialogClose()
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1100px] h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <motion.div 
            className={`p-6 border-b ${getStatusColor(task.status)} bg-opacity-20`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader>
              <div className="flex items-center justify-between mb-4">
                <DialogTitle className="text-2xl font-bold">{task.title}</DialogTitle>
                <div className="flex items-center space-x-2">
                  <Select
                    value={task.priority}
                    onValueChange={handlePriorityChange}
                  >
                    <SelectTrigger className={`text-sm px-3 py-1 ${getPriorityColor(task.priority)}`}>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low Priority</SelectItem>
                      <SelectItem value="Medium">Medium Priority</SelectItem>
                      <SelectItem value="High">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={task.status}
                    onValueChange={handleStatusChange}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="ml-2"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <UserCircle className="w-4 h-4" />
                  <span>{task.assignee}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created: {formatDate(task.created_at)}</span>
                  </div>
                  {task.due && (
                    <>
                      <div className="w-px h-4 bg-gray-300" />
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>Due: {formatDate(task.due)}</span>
                        {getDueStatus(task.due) && (
                          <Badge variant="destructive" className="ml-2">
                            {getDueStatus(task.due)}
                          </Badge>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </DialogHeader>
          </motion.div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 p-6 overflow-y-auto"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <div className="space-y-2">
                      <Input
                        id="title"
                        value={editingTask.title}
                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      />
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={async () => {
                          if (!editingTask.body.trim()) {
                            toast({
                              title: "No content to summarize",
                              description: "Please enter description text before generating a title.",
                              variant: "destructive",
                            })
                            return
                          }
                          setIsSummarizing(true)
                          try {
                            const response = await fetch('/api/summarize-title', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ text: editingTask.body }),
                            })
                            if (!response.ok) throw new Error('Failed to summarize')
                            const data = await response.json()
                            setEditingTask({ ...editingTask, title: data.summary })
                          } catch (error) {
                            console.error('Error summarizing title:', error)
                          } finally {
                            setIsSummarizing(false)
                          }
                        }}
                        disabled={isSummarizing || !editingTask.body.trim()}
                      >
                        {isSummarizing ? (
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Description</Label>
                    <Textarea
                      id="body"
                      value={editingTask.body}
                      onChange={(e) => setEditingTask({ ...editingTask, body: e.target.value })}
                      className="min-h-[200px]"
                    />
                    <Button 
                      variant="secondary" 
                      onClick={handleSummarize} 
                      disabled={isSummarizing}
                      size="sm"
                    >
                      {isSummarizing ? (
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={editingTask.status}
                        onValueChange={(value: Task['status']) => 
                          setEditingTask({ ...editingTask, status: value })}
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
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={editingTask.priority}
                        onValueChange={(value: Task['priority']) => 
                          setEditingTask({ ...editingTask, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select
                      value={editingTask.assignee}
                      onValueChange={(value: string) => 
                        setEditingTask({ ...editingTask, assignee: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ross">Ross</SelectItem>
                        <SelectItem value="Brian">Brian</SelectItem>
                        <SelectItem value="Spencer">Spencer</SelectItem>
                        <SelectItem value="Tommy">Tommy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save changes
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-1 min-h-0 p-6 space-x-6"
              >
                <div className="w-3/5 flex flex-col">
                  <h3 className="font-semibold text-lg mb-4">Task Description</h3>
                  <div className="flex-1 w-full rounded-md border p-4 bg-gray-50 overflow-y-auto" 
                       style={{ maxHeight: 'calc(100vh - 400px)' }}>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                      {task.body}
                    </div>
                  </div>
                </div>

                <div className="w-2/5 flex flex-col">
                  <h3 className="font-semibold text-lg mb-4 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Comments
                    <span className="ml-2 text-sm text-gray-500">
                      ({task.comments?.length || 0})
                    </span>
                  </h3>
                  <div 
                    className="flex-1 border rounded-md bg-gray-50 overflow-y-auto"
                    style={{ maxHeight: 'calc(100vh - 400px)' }}
                    ref={scrollViewportRef}
                  >
                    <div className="p-4 space-y-4">
                      {task.comments && task.comments.length > 0 ? (
                        task.comments.map(comment => (
                          <motion.div
                            key={comment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-4 rounded-lg shadow-sm border break-words"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={comment.profile?.avatar_url ?? undefined} />
                                  <AvatarFallback className="bg-muted">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                  </AvatarFallback>
                                </Avatar>
                                <p className="font-medium text-sm truncate">{comment.profile?.name || comment.author}</p>
                              </div>
                              <p className="text-xs text-gray-500 flex items-center flex-shrink-0">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(comment.created_at).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                              {formatTextWithLinks(comment.text)}
                            </p>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-8 text-gray-500"
                        >
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No comments yet</p>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddComment()
                        }
                      }}
                      className="flex-grow min-h-[2.5rem] max-h-[150px] resize-none"
                      disabled={isSubmitting}
                    />
                    <Button 
                      onClick={handleAddComment}
                      disabled={isSubmitting || !newComment.trim()}
                      className="flex-shrink-0"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="w-4 h-4" />
                          <span>Send</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
