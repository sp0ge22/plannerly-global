import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Task } from '@/types/task'

type EditTaskDialogProps = {
  task: Task
  updateTask: (task: Task) => void
}

export function EditTaskDialog({ task, updateTask }: EditTaskDialogProps) {
  const [editingTask, setEditingTask] = useState<Task>(task)
  const [isSummarizing, setIsSummarizing] = useState(false)

  const handleSave = () => {
    console.log('Saving task:', editingTask)
    updateTask(editingTask)
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

      if (!response.ok) {
        throw new Error('Failed to summarize')
      }

      const data = await response.json()
      setEditingTask({ ...editingTask, body: data.summary })
    } catch (error) {
      console.error('Error summarizing task:', error)
      // You might want to show an error message to the user here
    } finally {
      setIsSummarizing(false)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Edit Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Make changes to the task here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={editingTask.title}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={editingTask.body}
              onChange={(e) => setEditingTask({ ...editingTask, body: e.target.value })}
              className="min-h-[200px]"
            />
            <Button onClick={handleSummarize} disabled={isSummarizing}>
              {isSummarizing ? 'Summarizing...' : 'Summarize with ChatGPT'}
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={editingTask.status}
              onValueChange={(value: Task['status']) => setEditingTask({ ...editingTask, status: value })}
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
            <Label htmlFor="assignee">Assignee</Label>
            <Select
              value={editingTask.assignee}
              onValueChange={(value: Task['assignee']) => setEditingTask({ ...editingTask, assignee: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ross">Ross</SelectItem>
                <SelectItem value="Brian">Brian</SelectItem>
                <SelectItem value="Spencer">Spencer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
