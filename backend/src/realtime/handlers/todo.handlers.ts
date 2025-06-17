import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger';
import { TodoService } from '../../services/todo.service';
import { Priority } from '@shared/types/todo';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData,
  CreateTodoData,
  UpdateTodoData,
  ReorderTodoData,
  TodoFilters,
  SocketResponse,
  ActivityFeedItem
} from '../types';

const logger = createLogger('todo-handlers');
const prisma = new PrismaClient();

export class TodoEventHandlers {
  private todoService: TodoService;
  
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    private socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ) {
    this.todoService = new TodoService(prisma);
  }
  
  register(): void {
    this.socket.on('todo:create', this.handleCreate.bind(this));
    this.socket.on('todo:update', this.handleUpdate.bind(this));
    this.socket.on('todo:delete', this.handleDelete.bind(this));
    this.socket.on('todo:reorder', this.handleReorder.bind(this));
    this.socket.on('todo:subscribe', this.handleSubscribe.bind(this));
    this.socket.on('todo:unsubscribe', this.handleUnsubscribe.bind(this));
  }
  
  private async handleCreate(
    data: CreateTodoData, 
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      const userId = this.socket.data.userId;
      
      // Create todo
      const todo = await this.todoService.create(userId, {
        title: data.title,
        description: data.content,
        priority: (data.priority?.toUpperCase() as Priority) || Priority.MEDIUM,
        categoryId: data.categoryId,
        tagNames: data.tagIds, // Assuming tagIds are actually tag names
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        reminder: data.reminder ? new Date(data.reminder).toISOString() : undefined,
      });
      
      // Emit to all user's connected devices
      this.io.to(`user:${userId}`).emit('todo:created', todo);
      
      // Emit activity
      const activity: ActivityFeedItem = {
        id: `activity_${Date.now()}`,
        userId,
        action: 'created',
        entityType: 'todo',
        entityId: todo.id,
        entityTitle: todo.title,
        timestamp: new Date(),
      };
      
      this.io.to(`user:${userId}`).emit('activity:feed', activity);
      
      // Inter-server sync
      this.io.serverSideEmit('todo:sync', userId, todo);
      
      callback({ success: true, data: todo });
      
      logger.info({ userId, todoId: todo.id }, 'Todo created via socket');
    } catch (error) {
      logger.error({ error, userId: this.socket.data.userId }, 'Failed to create todo');
      callback({ 
        success: false, 
        error: { 
          code: 'CREATE_FAILED', 
          message: 'Failed to create todo' 
        } 
      });
    }
  }
  
  private async handleUpdate(
    data: UpdateTodoData,
    callback: (response: SocketResponse) => void
  ): Promise<void> {
    try {
      const userId = this.socket.data.userId;
      
      // Update todo
      const todo = await this.todoService.update(userId, data.id, {
        title: data.title,
        description: data.content,
        status: data.completed ? 'completed' : 'pending',
        priority: data.priority,
        categoryId: data.categoryId,
        dueDate: data.dueDate,
        reminder: data.reminder,
      });
      
      // Emit to all user's connected devices
      this.io.to(`user:${userId}`).emit('todo:updated', todo);
      
      // Emit activity for significant changes
      if (data.completed !== undefined) {
        const activity: ActivityFeedItem = {
          id: `activity_${Date.now()}`,
          userId,
          action: data.completed ? 'completed' : 'updated',
          entityType: 'todo',
          entityId: todo.id,
          entityTitle: todo.title,
          timestamp: new Date(),
        };
        
        this.io.to(`user:${userId}`).emit('activity:feed', activity);
      }
      
      // Inter-server sync
      this.io.serverSideEmit('todo:sync', userId, todo);
      
      callback({ success: true, data: todo });
      
      logger.info({ userId, todoId: todo.id }, 'Todo updated via socket');
    } catch (error) {
      logger.error({ error, userId: this.socket.data.userId }, 'Failed to update todo');
      callback({ 
        success: false, 
        error: { 
          code: 'UPDATE_FAILED', 
          message: 'Failed to update todo' 
        } 
      });
    }
  }
  
  private async handleDelete(
    todoId: string,
    callback: (response: SocketResponse<void>) => void
  ): Promise<void> {
    try {
      const userId = this.socket.data.userId;
      
      // Get todo details before deletion for activity
      const todo = await this.todoService.getById(userId, todoId);
      
      // Delete todo
      await this.todoService.delete(userId, todoId);
      
      // Emit to all user's connected devices
      this.io.to(`user:${userId}`).emit('todo:deleted', todoId);
      
      // Emit activity
      const activity: ActivityFeedItem = {
        id: `activity_${Date.now()}`,
        userId,
        action: 'deleted',
        entityType: 'todo',
        entityId: todoId,
        entityTitle: todo.title,
        timestamp: new Date(),
      };
      
      this.io.to(`user:${userId}`).emit('activity:feed', activity);
      
      callback({ success: true });
      
      logger.info({ userId, todoId }, 'Todo deleted via socket');
    } catch (error) {
      logger.error({ error, userId: this.socket.data.userId }, 'Failed to delete todo');
      callback({ 
        success: false, 
        error: { 
          code: 'DELETE_FAILED', 
          message: 'Failed to delete todo' 
        } 
      });
    }
  }
  
  private async handleReorder(
    data: ReorderTodoData,
    callback: (response: SocketResponse<void>) => void
  ): Promise<void> {
    try {
      const userId = this.socket.data.userId;
      
      // Update todo position
      await this.todoService.update(userId, data.todoId, {
        position: data.newPosition,
        categoryId: data.categoryId,
      });
      
      // Emit to all user's connected devices
      this.io.to(`user:${userId}`).emit('todo:reordered', data);
      
      callback({ success: true });
      
      logger.info({ userId, todoId: data.todoId, newPosition: data.newPosition }, 'Todo reordered via socket');
    } catch (error) {
      logger.error({ error, userId: this.socket.data.userId }, 'Failed to reorder todo');
      callback({ 
        success: false, 
        error: { 
          code: 'REORDER_FAILED', 
          message: 'Failed to reorder todo' 
        } 
      });
    }
  }
  
  private async handleSubscribe(filters?: TodoFilters): Promise<void> {
    const userId = this.socket.data.userId;
    
    // Store filters in socket data for filtered updates
    this.socket.data.todoFilters = filters;
    
    // Join filtered room if needed
    if (filters?.categoryId) {
      this.socket.join(`user:${userId}:category:${filters.categoryId}`);
    }
    
    logger.info({ userId, filters }, 'User subscribed to todo updates');
  }
  
  private async handleUnsubscribe(): Promise<void> {
    const userId = this.socket.data.userId;
    
    // Clear filters
    delete this.socket.data.todoFilters;
    
    // Leave all category rooms
    const rooms = Array.from(this.socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith(`user:${userId}:category:`)) {
        this.socket.leave(room);
      }
    });
    
    logger.info({ userId }, 'User unsubscribed from todo updates');
  }
}