import { TaskCard } from './TaskCard';
import { Task } from '@/types/task';

type TaskListProps = {
  tasks: Task[];
  updateTask: (task: Task) => void;
  addComment: (taskId: number, comment: string) => Promise<void>;
  deleteTask: (taskId: number, pin: string) => Promise<boolean>;
  toggleArchive: (taskId: number, archived: boolean) => Promise<void>;
};

export function TaskList({
  tasks,
  updateTask,
  addComment,
  deleteTask,
  toggleArchive,
}: TaskListProps) {
  return (
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
  );
}
