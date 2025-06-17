import { Server, Socket } from 'socket.io';
import { createLogger } from '../../utils/logger';
import Redis from 'ioredis';
import { config } from '../../config';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData,
  ActivityFeedItem
} from '../types';

const logger = createLogger('activity-handlers');

export class ActivityHandlers {
  private redis: Redis;
  private isSubscribed: boolean = false;
  
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    private socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ) {
    this.redis = new Redis(config.redis?.url || 'redis://localhost:6379');
  }
  
  register(): void {
    this.socket.on('activity:subscribe', this.handleSubscribe.bind(this));
    this.socket.on('activity:unsubscribe', this.handleUnsubscribe.bind(this));
    
    // Listen for inter-server activity sync
    this.io.on('activity:sync', this.handleActivitySync.bind(this));
  }
  
  private async handleSubscribe(): Promise<void> {
    const userId = this.socket.data.userId;
    
    // Join activity room
    this.socket.join(`activity:${userId}`);
    this.isSubscribed = true;
    
    // Send recent activity
    await this.sendRecentActivity();
    
    logger.info({ userId }, 'User subscribed to activity feed');
  }
  
  private async handleUnsubscribe(): Promise<void> {
    const userId = this.socket.data.userId;
    
    // Leave activity room
    this.socket.leave(`activity:${userId}`);
    this.isSubscribed = false;
    
    logger.info({ userId }, 'User unsubscribed from activity feed');
  }
  
  private async sendRecentActivity(): Promise<void> {
    try {
      const userId = this.socket.data.userId;
      
      // Get recent activity from Redis (last 50 items)
      const activityKeys = await this.redis.zrevrange(
        `activity:user:${userId}`,
        0,
        49
      );
      
      for (const key of activityKeys) {
        const activityData = await this.redis.get(key);
        if (activityData) {
          const activity = JSON.parse(activityData) as ActivityFeedItem;
          this.socket.emit('activity:feed', activity);
        }
      }
    } catch (error) {
      logger.error({ error }, 'Failed to send recent activity');
    }
  }
  
  // Store activity in Redis for persistence
  async storeActivity(activity: ActivityFeedItem): Promise<void> {
    try {
      const key = `activity:${activity.id}`;
      const score = activity.timestamp.getTime();
      
      // Store activity data
      await this.redis.setex(
        key,
        86400 * 7, // Keep for 7 days
        JSON.stringify(activity)
      );
      
      // Add to user's activity sorted set
      await this.redis.zadd(
        `activity:user:${activity.userId}`,
        score,
        key
      );
      
      // Trim to keep only last 100 activities
      await this.redis.zremrangebyrank(
        `activity:user:${activity.userId}`,
        0,
        -101
      );
    } catch (error) {
      logger.error({ error }, 'Failed to store activity');
    }
  }
  
  // Handle activity from other servers
  private async handleActivitySync(activity: ActivityFeedItem): Promise<void> {
    if (this.isSubscribed && activity.userId === this.socket.data.userId) {
      this.socket.emit('activity:feed', activity);
    }
  }
  
  // Helper to create and emit activity
  async createActivity(
    action: ActivityFeedItem['action'],
    entityType: ActivityFeedItem['entityType'],
    entityId: string,
    entityTitle: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const activity: ActivityFeedItem = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.socket.data.userId,
      action,
      entityType,
      entityId,
      entityTitle,
      metadata,
      timestamp: new Date(),
    };
    
    // Store in Redis
    await this.storeActivity(activity);
    
    // Emit to user's activity room
    this.io.to(`activity:${activity.userId}`).emit('activity:feed', activity);
    
    // Sync across servers
    this.io.serverSideEmit('activity:sync', activity);
  }
}