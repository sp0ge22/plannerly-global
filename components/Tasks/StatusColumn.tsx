import { Task } from '@/types/task'
import { TaskCard } from './TaskCard'

type StatusColumnProps = {
  title: string;
  tasks: Task[];
  updateTask: (task: Task) => void;
  addComment: (taskId: number, comment: string) => Promise<void>;
  deleteTask: (taskId: number, pin: string) => Promise<boolean>;
  toggleArchive: (taskId: number, archived: boolean) => Promise<void>;
};

export function StatusColumn({ 
  title, 
  tasks, 
  updateTask, 
  addComment, 
  deleteTask,
  toggleArchive,
}: StatusColumnProps) {
  return (
    <div className="bg-gray-100 rounded-lg p-4 min-w-[300px] max-w-[400px] flex-1">
      <h2 className="text-lg font-semibold mb-4 text-center">{title}</h2>
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
    </div>
  )
}
