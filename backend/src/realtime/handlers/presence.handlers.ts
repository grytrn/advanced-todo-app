import { Server, Socket } from 'socket.io';
import { createLogger } from '../../utils/logger';
import Redis from 'ioredis';
import { config } from '../../config';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  InterServerEvents, 
  SocketData,
  PresenceStatus,
  TypingIndicator
} from '../types';

const logger = createLogger('presence-handlers');

export class PresenceHandlers {
  private redis: Redis;
  private presenceTimeout: NodeJS.Timeout | null = null;
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    private socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ) {
    this.redis = new Redis(config.redis?.url || 'redis://localhost:6379');
  }
  
  register(): void {
    this.socket.on('presence:update', this.handlePresenceUpdate.bind(this));
    this.socket.on('presence:typing:start', this.handleTypingStart.bind(this));
    this.socket.on('presence:typing:stop', this.handleTypingStop.bind(this));
    
    // Set initial presence
    this.setUserOnline();
  }
  
  private async setUserOnline(): Promise<void> {
    const userId = this.socket.data.userId;
    const status: PresenceStatus = {
      status: 'online',
      lastActivity: new Date(),
      device: this.socket.handshake.headers['user-agent']?.substring(0, 50),
    };
    
    // Store in Redis with expiry
    await this.redis.setex(
      `presence:${userId}`,
      300, // 5 minutes
      JSON.stringify(status)
    );
    
    // Broadcast to all connected users
    this.socket.broadcast.emit('presence:online', userId, status);
    
    // Inter-server sync
    this.io.serverSideEmit('presence:sync', userId, status);
    
    // Set up heartbeat
    this.startHeartbeat();
    
    logger.info({ userId }, 'User presence set to online');
  }
  
  private startHeartbeat(): void {
    // Clear existing timeout
    if (this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
    }
    
    // Refresh presence every 4 minutes
    this.presenceTimeout = setTimeout(() => {
      this.setUserOnline();
    }, 240000); // 4 minutes
  }
  
  private async handlePresenceUpdate(status: PresenceStatus): Promise<void> {
    const userId = this.socket.data.userId;
    
    // Update Redis
    await this.redis.setex(
      `presence:${userId}`,
      300,
      JSON.stringify(status)
    );
    
    // Broadcast to all connected users
    this.socket.broadcast.emit('presence:online', userId, status);
    
    // Inter-server sync
    this.io.serverSideEmit('presence:sync', userId, status);
    
    logger.info({ userId, status: status.status }, 'User presence updated');
  }
  
  private async handleTypingStart(todoId: string): Promise<void> {
    const userId = this.socket.data.userId;
    const indicator: TypingIndicator = {
      userId,
      todoId,
      isTyping: true,
    };
    
    // Clear any existing typing timeout for this todo
    const timeoutKey = `${userId}:${todoId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
    }
    
    // Broadcast to other users
    this.socket.broadcast.emit('presence:typing', indicator);
    
    // Auto-stop typing after 5 seconds
    const timeout = setTimeout(() => {
      this.handleTypingStop(todoId);
    }, 5000);
    
    this.typingTimeouts.set(timeoutKey, timeout);
    
    logger.debug({ userId, todoId }, 'User started typing');
  }
  
  private async handleTypingStop(todoId: string): Promise<void> {
    const userId = this.socket.data.userId;
    const indicator: TypingIndicator = {
      userId,
      todoId,
      isTyping: false,
    };
    
    // Clear timeout
    const timeoutKey = `${userId}:${todoId}`;
    if (this.typingTimeouts.has(timeoutKey)) {
      clearTimeout(this.typingTimeouts.get(timeoutKey)!);
      this.typingTimeouts.delete(timeoutKey);
    }
    
    // Broadcast to other users
    this.socket.broadcast.emit('presence:typing', indicator);
    
    logger.debug({ userId, todoId }, 'User stopped typing');
  }
  
  async handleDisconnect(): Promise<void> {
    const userId = this.socket.data.userId;
    
    // Clear heartbeat
    if (this.presenceTimeout) {
      clearTimeout(this.presenceTimeout);
    }
    
    // Clear all typing timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
    
    // Check if user has other active connections
    const userSockets = await this.io.in(`user:${userId}`).fetchSockets();
    
    if (userSockets.length === 0) {
      // No other connections, set user offline
      await this.redis.del(`presence:${userId}`);
      
      // Broadcast offline status
      this.socket.broadcast.emit('presence:offline', userId);
      
      // Inter-server sync
      this.io.serverSideEmit('presence:sync', userId, null);
      
      logger.info({ userId }, 'User presence set to offline');
    }
  }
}