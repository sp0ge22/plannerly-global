export interface Comment {
  id: number;
  task_id: number;
  author: string;
  text: string;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  body: string;
  status: 'To Do' | 'In Progress' | 'Done';
  assignee: string;
  priority: 'Low' | 'Medium' | 'High';
  comments: Comment[]; // Ensure this is required and always definedI
  created_at: string;
  due: string | null;  // Add this line
  archived: boolean;
}
