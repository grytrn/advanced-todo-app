import type { Todo, Category, Tag, User } from '@prisma/client';

// Socket data stored in each connection
export interface SocketData {
  userId: string;
  user: User;
  todoFilters?: TodoFilters;
}

// Client to Server events
export interface ClientToServerEvents {
  // Todo events
  'todo:create': (data: CreateTodoData, callback: (response: SocketResponse<Todo>) => void) => void;
  'todo:update': (data: UpdateTodoData, callback: (response: SocketResponse<Todo>) => void) => void;
  'todo:delete': (todoId: string, callback: (response: SocketResponse<void>) => void) => void;
  'todo:reorder': (data: ReorderTodoData, callback: (response: SocketResponse<void>) => void) => void;
  'todo:subscribe': (filters?: TodoFilters) => void;
  'todo:unsubscribe': () => void;
  
  // Category events
  'category:create': (data: CreateCategoryData, callback: (response: SocketResponse<Category>) => void) => void;
  'category:update': (data: UpdateCategoryData, callback: (response: SocketResponse<Category>) => void) => void;
  'category:delete': (categoryId: string, callback: (response: SocketResponse<void>) => void) => void;
  
  // Tag events
  'tag:create': (name: string, callback: (response: SocketResponse<Tag>) => void) => void;
  'tag:delete': (tagId: string, callback: (response: SocketResponse<void>) => void) => void;
  
  // Presence events
  'presence:update': (status: PresenceStatus) => void;
  'presence:typing:start': (todoId: string) => void;
  'presence:typing:stop': (todoId: string) => void;
  
  // Activity events
  'activity:subscribe': () => void;
  'activity:unsubscribe': () => void;
}

// Server to Client events
export interface ServerToClientEvents {
  // Todo events
  'todo:created': (todo: Todo) => void;
  'todo:updated': (todo: Todo) => void;
  'todo:deleted': (todoId: string) => void;
  'todo:reordered': (data: ReorderTodoData) => void;
  
  // Category events
  'category:created': (category: Category) => void;
  'category:updated': (category: Category) => void;
  'category:deleted': (categoryId: string) => void;
  
  // Tag events
  'tag:created': (tag: Tag) => void;
  'tag:deleted': (tagId: string) => void;
  
  // Presence events
  'presence:online': (userId: string, status: PresenceStatus) => void;
  'presence:offline': (userId: string) => void;
  'presence:typing': (data: TypingIndicator) => void;
  
  // Notification events
  'notification': (notification: RealtimeNotification) => void;
  
  // Activity events
  'activity:feed': (activity: ActivityFeedItem) => void;
  
  // System events
  'error': (error: SocketError) => void;
  'sync:required': () => void;
}

// Inter-server events (for Redis pub/sub)
export interface InterServerEvents {
  'todo:sync': (userId: string, todo: Todo) => void;
  'category:sync': (userId: string, category: Category) => void;
  'presence:sync': (userId: string, status: PresenceStatus | null) => void;
  'activity:sync': (activity: ActivityFeedItem) => void;
}

// Data types
export interface CreateTodoData {
  title: string;
  content?: string;
  priority?: 'low' | 'medium' | 'high';
  categoryId?: string;
  tagIds?: string[];
  dueDate?: string;
  reminder?: string;
}

export interface UpdateTodoData {
  id: string;
  title?: string;
  content?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  categoryId?: string | null;
  tagIds?: string[];
  dueDate?: string | null;
  reminder?: string | null;
}

export interface ReorderTodoData {
  todoId: string;
  newPosition: number;
  categoryId?: string;
}

export interface CreateCategoryData {
  name: string;
  color: string;
  icon?: string;
}

export interface UpdateCategoryData {
  id: string;
  name?: string;
  color?: string;
  icon?: string | null;
}

export interface TodoFilters {
  categoryId?: string;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  tagIds?: string[];
}

export interface PresenceStatus {
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity?: Date;
  device?: string;
}

export interface TypingIndicator {
  userId: string;
  todoId: string;
  isTyping: boolean;
}

export interface RealtimeNotification {
  id: string;
  type: 'todo_reminder' | 'todo_shared' | 'todo_assigned' | 'export_complete';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export interface ActivityFeedItem {
  id: string;
  userId: string;
  action: 'created' | 'updated' | 'completed' | 'deleted' | 'shared';
  entityType: 'todo' | 'category' | 'tag';
  entityId: string;
  entityTitle: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface SocketResponse<T = any> {
  success: boolean;
  data?: T;
  error?: SocketError;
}

export interface SocketError {
  code: string;
  message: string;
  details?: any;
}