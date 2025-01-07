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
  /**
   * New prop indicating whether the entire dashboard is empty
   */
  isDashboardEmpty: boolean
}

export function StatusColumn({
  title,
  tasks,
  updateTask,
  addComment,
  deleteTask,
  toggleArchive,
  isDashboardEmpty,
}: StatusColumnProps) {
  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'To Do':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800'
      case 'In Progress':
        return 'bg-blue-100 border-blue-200 text-blue-800'
      case 'Done':
        return 'bg-green-100 border-green-200 text-green-800'
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800'
    }
  }

  // Helper function to format title in title case
  const formatTitle = (text: string) => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return (
    <div className="bg-muted/30 rounded-lg p-4">
      <div
        className={`border rounded-full px-4 py-1 mb-4 w-fit mx-auto shadow-sm ${getStatusColor(
          title
        )}`}
      >
        <h3 className="font-semibold text-base tracking-wide text-center">
          {formatTitle(title)}
        </h3>
      </div>

      {tasks.length === 0 ? (
        /**
         * Only show "No tasks" if the entire (filtered) dashboard is empty
         */
        isDashboardEmpty ? (
          <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-muted rounded-lg">
            <Library className="w-5 h-5 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No tasks</p>
          </div>
        ) : null
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
