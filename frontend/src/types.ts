export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  REVIEW = "review",
  DONE = "done"
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  position: number;
  board_id: number;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  tasks: Task[];
}

export interface WSEvent {
  type: string;
  payload: any;
  user_id?: string;
  timestamp: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  taskId?: number;
}

export interface ActiveUser {
  id: string;
  cursor?: CursorPosition;
  color: string;
}

export const COLUMN_CONFIG: Record<TaskStatus, { title: string; color: string }> = {
  [TaskStatus.TODO]: { title: "To Do", color: "bg-slate-500" },
  [TaskStatus.IN_PROGRESS]: { title: "In Progress", color: "bg-blue-500" },
  [TaskStatus.REVIEW]: { title: "Review", color: "bg-amber-500" },
  [TaskStatus.DONE]: { title: "Done", color: "bg-green-500" }
};
