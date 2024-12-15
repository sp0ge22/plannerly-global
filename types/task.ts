export interface Comment {
  id: number;
  author: string;
  text: string;
  created_at: string;
  user_id: string;
  profile: {
    avatar_url: string | null;
    name: string | null;
  } | null;
}

export interface Task {
  id: number;
  title: string;
  body: string;
  status: 'To Do' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  assignee: string;
  assignee_avatar_url?: string | null;
  assignee_id?: string;
  created_at: string;
  due: string | null;
  comments: Comment[];
  tenant_id: string;
  tenant_name?: string;
  tenant_avatar_url?: string;
  archived: boolean;
}
