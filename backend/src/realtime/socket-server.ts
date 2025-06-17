import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { FastifyInstance } from 'fastify';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import { authenticateSocket } from './middlewares/auth.middleware';
import { TodoEventHandlers } from './handlers/todo.handlers';
import { PresenceHandlers } from './handlers/presence.handlers';
import { NotificationHandlers } from './handlers/notification.handlers';
import { ActivityHandlers } from './handlers/activity.handlers';
import { RedisAdapter } from './adapters/redis.adapter';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from './types';

const logger = createLogger('socket-server');

export class SocketIOServer {
  private io: SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
  private redisAdapter: RedisAdapter | null = null;
  
  constructor(
    private httpServer: HttpServer,
    private app: FastifyInstance
  ) {
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });
    
    this.setupMiddlewares();
    this.setupHandlers();
  }
  
  private setupMiddlewares(): void {
    // Authentication middleware
    this.io.use(authenticateSocket(this.app));
  }
  
  private setupHandlers(): void {
    this.io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
      const userId = socket.data.userId;
      logger.info({ userId, socketId: socket.id }, 'User connected');
      
      // Join user's personal room
      socket.join(`user:${userId}`);
      
      // Initialize handlers
      const todoHandlers = new TodoEventHandlers(this.io, socket);
      const presenceHandlers = new PresenceHandlers(this.io, socket);
      const notificationHandlers = new NotificationHandlers(this.io, socket);
      const activityHandlers = new ActivityHandlers(this.io, socket);
      
      // Register event handlers
      todoHandlers.register();
      presenceHandlers.register();
      notificationHandlers.register();
      activityHandlers.register();
      
      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info({ userId, socketId: socket.id }, 'User disconnected');
        presenceHandlers.handleDisconnect();
      });
    });
  }
  
  async setupRedisAdapter(redisUrl: string): Promise<void> {
    try {
      this.redisAdapter = new RedisAdapter(redisUrl);
      await this.redisAdapter.connect();
      
      const adapter = this.redisAdapter.createIOAdapter();
      this.io.adapter(adapter);
      
      logger.info('Redis adapter connected for Socket.IO scaling');
    } catch (error) {
      logger.error({ error }, 'Failed to setup Redis adapter');
      throw error;
    }
  }
  
  getIO(): SocketServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
    return this.io;
  }
  
  async close(): Promise<void> {
    if (this.redisAdapter) {
      await this.redisAdapter.disconnect();
    }
    
    return new Promise((resolve) => {
      this.io.close(() => {
        logger.info('Socket.IO server closed');
        resolve();
      });
    });
  }
}