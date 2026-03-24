export type Bindings = {
  DB: D1Database;
}

export interface Client {
  id: number;
  name: string;
  industry?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'prospect';
  grade: 'vip' | 'premium' | 'normal';
  notes?: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
  task_count?: number;
}

export interface Contact {
  id: number;
  client_id: number;
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  is_primary: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  department?: string;
  phone?: string;
  avatar_color: string;
  is_active: number;
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  client_id?: number;
  assignee_id?: number;
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  category?: string;
  due_date?: string;
  completed_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  client_name?: string;
  assignee_name?: string;
  assignee_color?: string;
  creator_name?: string;
}

export interface Activity {
  id: number;
  client_id?: number;
  task_id?: number;
  member_id?: number;
  type: 'call' | 'email' | 'meeting' | 'visit' | 'proposal' | 'contract' | 'note' | 'task_update';
  title: string;
  content?: string;
  outcome?: string;
  next_action?: string;
  next_action_date?: string;
  created_at: string;
  client_name?: string;
  member_name?: string;
  member_color?: string;
  task_title?: string;
}

export interface DashboardStats {
  total_clients: number;
  active_clients: number;
  prospect_clients: number;
  total_tasks: number;
  todo_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  done_tasks: number;
  recent_activities: Activity[];
  upcoming_tasks: Task[];
}
