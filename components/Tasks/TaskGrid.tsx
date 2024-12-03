import { TaskCard } from './TaskCard';
import { Task } from '@/types/task';

type TaskGridProps = {
  tasks: Task[];
  updateTask: (task: Task) => void;
  addComment: (taskId: number, comment: string) => Promise<void>;
  deleteTask: (taskId: number, pin: string) => Promise<boolean>;
  toggleArchive: (taskId: number, archived: boolean) => Promise<void>;
};

export const sortTasks = (tasks: Task[]) => {
  return tasks.sort((a, b) => {
    // Sort by due date
    const dateA = a.due ? new Date(a.due).getTime() : Infinity;
    const dateB = b.due ? new Date(b.due).getTime() : Infinity;
    if (dateA !== dateB) {
      return dateA - dateB;
    }

    // If due dates are the same, sort by priority
    const priorityOrder = { 'Low': 3, 'Medium': 2, 'High': 1 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

export function TaskGrid({
  tasks,
  updateTask,
  addComment,
  deleteTask,
  toggleArchive,
}: TaskGridProps) {
  const sortedTasks = sortTasks(tasks);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {sortedTasks.map((task) => (
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
