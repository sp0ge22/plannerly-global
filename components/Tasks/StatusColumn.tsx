import { Task } from '@/types/task'
import { TaskCard } from './TaskCard'
import { Library } from 'lucide-react'

interface StatusColumnProps {
  title: string
  tasks: Task[]
  updateTask: (task: Task) => void
  addComment: (taskId: number, comment: string) => Promise<void>
  deleteTask: (taskId: number, pin: string) => Promise<boolean>
  toggleArchive: (taskId: number, archived: boolean) => Promise<void>
}

export function StatusColumn({
  title,
  tasks,
  updateTask,
  addComment,
  deleteTask,
  toggleArchive,
}: StatusColumnProps) {
  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <h3 className="font-semibold mb-4 text-sm uppercase tracking-wide">{title}</h3>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
          <Library className="w-5 h-5 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No tasks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              updateTask={updateTask}
              addComment={addComment}
              deleteTask={deleteTask}
              toggleArchive={toggleArchive}
            />
          ))}
        </div>
      )}
    </div>
  )
}


