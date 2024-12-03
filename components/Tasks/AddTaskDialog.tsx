import { useState, ReactNode } from 'react'
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

type AddTaskDialogProps = {
  addTask: (task: Omit<Task, 'id' | 'comments' | 'created_at'>) => Promise<boolean>
  children: ReactNode
}

export function AddTaskDialog({ addTask, children }: AddTaskDialogProps) {
  const [newTask, setNewTask] = useState<Omit<Task, 'id' | 'comments' | 'created_at'>>({
    title: '',
    body: '',
    assignee: 'Ross',
    status: 'To Do',
    priority: 'Medium',
    due: null,
    archived: false
  })
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

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

    setIsSummarizing(true)
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
      setIsSummarizing(false)
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

    setIsSubmitting(true)
    try {
      const success = await addTask(newTask)
      if (success) {
        setIsOpen(false)
        setNewTask({ 
          title: '', 
          body: '', 
          assignee: 'Ross', 
          status: 'To Do', 
          priority: 'Medium', 
          due: null,
          archived: false
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Task</DialogTitle>
          <DialogDescription className="text-gray-500">
            Create a new task and add it to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 py-4"
        >
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
                setIsSummarizing(true)
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
                  setIsSummarizing(false)
                }
              }}
              disabled={isSummarizing || !newTask.body.trim()}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-body" className="text-sm font-medium">Description</Label>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSummarize}
                disabled={isSummarizing || !newTask.body.trim()}
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
            <Textarea
              id="new-body"
              value={newTask.body}
              onChange={(e) => setNewTask({ ...newTask, body: e.target.value })}
              className="min-h-[200px] resize-y"
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
              onValueChange={(value: Task['assignee']) => setNewTask({ ...newTask, assignee: value })}
            >
              <SelectTrigger id="new-assignee" className="w-full">
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
                  onSelect={(date) => setNewTask({ 
                    ...newTask, 
                    due: date ? date.toISOString() : null 
                  })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>

        <DialogFooter className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
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
