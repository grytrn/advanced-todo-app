import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger';
import Redis from 'ioredis';
import { config } from '../../config';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData,
  RealtimeNotification
} from '../types';

const logger = createLogger('notification-handlers');

export class NotificationHandlers {
  private redis: Redis;
  private prisma: PrismaClient;
  private reminderCheckInterval: NodeJS.Timer | null = null;
  
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    private socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ) {
    this.redis = new Redis(config.redis?.url || 'redis://localhost:6379');
    this.prisma = new PrismaClient();
  }
  
  register(): void {
    // Start checking for reminders
    this.startReminderCheck();
  }
  
  private startReminderCheck(): void {
    // Check for reminders every minute
    this.reminderCheckInterval = setInterval(async () => {
      await this.checkAndSendReminders();
    }, 60000); // 1 minute
    
    // Also check immediately
    this.checkAndSendReminders();
  }
  
  private async checkAndSendReminders(): Promise<void> {
    try {
      const userId = this.socket.data.userId;
      const now = new Date();
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);
      
      // Find todos with reminders in the next 5 minutes
      const todosWithReminders = await this.prisma.todo.findMany({
        where: {
          userId,
          reminder: {
            gte: now,
            lte: fiveMinutesFromNow,
          },
          completed: false,
        },
      });
      
      for (const todo of todosWithReminders) {
        // Check if we already sent this reminder
        const reminderKey = `reminder:${todo.id}:${todo.reminder!.getTime()}`;
        const alreadySent = await this.redis.get(reminderKey);
        
        if (!alreadySent) {
          const notification: RealtimeNotification = {
            id: `notif_${Date.now()}_${todo.id}`,
            type: 'todo_reminder',
            title: 'Todo Reminder',
            message: `Reminder: ${todo.title}`,
            data: {
              todoId: todo.id,
              dueDate: todo.dueDate,
              priority: todo.priority,
            },
            timestamp: new Date(),
          };
          
          // Send to all user's devices
          this.io.to(`user:${userId}`).emit('notification', notification);
          
          // Mark as sent (expire after 1 hour to prevent duplicates)
          await this.redis.setex(reminderKey, 3600, '1');
          
          logger.info({ userId, todoId: todo.id }, 'Reminder notification sent');
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to check reminders');
    }
  }
  
  // Send export completion notification
  async sendExportCompleteNotification(userId: string, exportData: any): Promise<void> {
    const notification: RealtimeNotification = {
      id: `notif_export_${Date.now()}`,
      type: 'export_complete',
      title: 'Export Complete',
      message: 'Your TODO export is ready for download',
      data: exportData,
      timestamp: new Date(),
    };
    
    // Send to all user's devices
    this.io.to(`user:${userId}`).emit('notification', notification);
    
    logger.info({ userId }, 'Export completion notification sent');
  }
  
  // Send shared todo notification
  async sendTodoSharedNotification(
    fromUserId: string, 
    toUserId: string, 
    todoTitle: string
  ): Promise<void> {
    const fromUser = await this.prisma.user.findUnique({
      where: { id: fromUserId },
      select: { name: true },
    });
    
    const notification: RealtimeNotification = {
      id: `notif_shared_${Date.now()}`,
      type: 'todo_shared',
      title: 'Todo Shared With You',
      message: `${fromUser?.name || 'Someone'} shared "${todoTitle}" with you`,
      data: {
        fromUserId,
        fromUserName: fromUser?.name,
      },
      timestamp: new Date(),
    };
    
    // Send to recipient's devices
    this.io.to(`user:${toUserId}`).emit('notification', notification);
    
    logger.info({ fromUserId, toUserId }, 'Shared todo notification sent');
  }
  
  cleanup(): void {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
    }
  }
}