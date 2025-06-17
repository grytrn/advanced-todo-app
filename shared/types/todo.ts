// Shared type definitions for TODOs

export interface Todo {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  reminder?: Date | null;
  priority: Priority;
  status: TodoStatus;
  isRecurring: boolean;
  recurrence?: Recurrence | null;
  userId: string;
  categoryId?: string | null;
  position: number;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  
  // Relations (optional, included when requested)
  user?: {
    id: string;
    name: string;
    email: string;
  };
  category?: Category | null;
  tags?: Tag[];
  attachments?: Attachment[];
  commentsCount?: number;
  isShared?: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  todosCount?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  todoId: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum TodoStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum Recurrence {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

// Request/Response types
export interface CreateTodoRequest {
  title: string;
  description?: string;
  dueDate?: string; // ISO 8601
  reminder?: string; // ISO 8601
  priority?: Priority;
  categoryId?: string;
  tags?: string[];
  isRecurring?: boolean;
  recurrence?: Recurrence;
}

export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  dueDate?: string | null;
  reminder?: string | null;
  priority?: Priority;
  status?: TodoStatus;
  categoryId?: string | null;
  tags?: string[];
  position?: number;
  isRecurring?: boolean;
  recurrence?: Recurrence | null;
}

export interface TodoListRequest {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'position';
  sortOrder?: 'asc' | 'desc';
  categoryId?: string;
  tag?: string;
  search?: string;
  status?: TodoStatus | 'all';
  priority?: Priority;
  hasDueDate?: boolean;
  isOverdue?: boolean;
}

export interface TodoListResponse {
  success: true;
  data: {
    items: Todo[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface TodoResponse {
  success: true;
  data: {
    todo: Todo;
  };
}

export interface TodosReorderRequest {
  todoIds: string[];
}

export interface TodosReorderResponse {
  success: true;
  data: {
    todos: Todo[];
  };
}

export interface TodoError {
  success: false;
  error: {
    code: 'TODO_NOT_FOUND' | 'CATEGORY_NOT_FOUND' | 'INVALID_STATUS_TRANSITION' | 'PERMISSION_DENIED';
    message: string;
  };
}