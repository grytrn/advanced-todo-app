import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createServer } from 'http';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { buildApp } from '../../app';
import { SocketIOServer } from '../socket-server';
import { PrismaClient } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

describe('Socket.IO Server', () => {
  let httpServer: any;
  let socketServer: SocketIOServer;
  let clientSocket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let app: any;
  const prisma = new PrismaClient();
  
  const testUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
  };
  
  const validToken = 'valid-jwt-token';
  
  beforeAll(async () => {
    // Build Fastify app
    app = await buildApp();
    
    // Mock JWT verification
    app.jwt.verify = vi.fn().mockReturnValue({
      id: testUser.id,
      email: testUser.email,
      type: 'access',
    });
    
    // Mock Prisma user lookup
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...testUser,
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    
    // Create HTTP server
    httpServer = createServer(app.server);
    
    // Initialize Socket.IO server
    socketServer = new SocketIOServer(httpServer, app);
    
    // Start server
    await new Promise<void>((resolve) => {
      httpServer.listen(3001, () => {
        resolve();
      });
    });
  });
  
  afterAll(async () => {
    // Cleanup
    if (clientSocket) {
      clientSocket.close();
    }
    
    await socketServer.close();
    
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
    
    await prisma.$disconnect();
  });
  
  describe('Connection', () => {
    it('should connect with valid authentication', async () => {
      await new Promise<void>((resolve, reject) => {
        clientSocket = ioClient('http://localhost:3001', {
          auth: { token: validToken },
          transports: ['websocket'],
        });
        
        clientSocket.on('connect', () => {
          expect(clientSocket.connected).toBe(true);
          resolve();
        });
        
        clientSocket.on('connect_error', (error) => {
          reject(error);
        });
      });
    });
    
    it('should reject connection without token', async () => {
      const unauthorizedSocket = ioClient('http://localhost:3001', {
        transports: ['websocket'],
      });
      
      await new Promise<void>((resolve) => {
        unauthorizedSocket.on('connect_error', (error) => {
          expect(error.message).toContain('Authentication required');
          unauthorizedSocket.close();
          resolve();
        });
      });
    });
  });
  
  describe('Todo Events', () => {
    beforeAll(async () => {
      // Ensure client is connected
      if (!clientSocket?.connected) {
        clientSocket = ioClient('http://localhost:3001', {
          auth: { token: validToken },
          transports: ['websocket'],
        });
        
        await new Promise<void>((resolve) => {
          clientSocket.on('connect', resolve);
        });
      }
    });
    
    it('should create a todo', async () => {
      // Mock todo service
      const mockTodo = {
        id: 'todo-123',
        title: 'Test Todo',
        description: 'Test description',
        userId: testUser.id,
        priority: 'high',
        status: 'pending',
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.spyOn(prisma.todo, 'create').mockResolvedValue(mockTodo as any);
      vi.spyOn(prisma.todo, 'findFirst').mockResolvedValue({ position: 0 } as any);
      
      await new Promise<void>((resolve) => {
        // Listen for the created event
        clientSocket.on('todo:created', (todo) => {
          expect(todo.id).toBe(mockTodo.id);
          expect(todo.title).toBe(mockTodo.title);
          resolve();
        });
        
        // Emit create event
        clientSocket.emit('todo:create', {
          title: 'Test Todo',
          content: 'Test description',
          priority: 'high',
        }, (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toBeDefined();
        });
      });
    });
    
    it('should update a todo', async () => {
      const mockTodo = {
        id: 'todo-123',
        title: 'Updated Todo',
        completed: true,
        userId: testUser.id,
      };
      
      vi.spyOn(prisma.todo, 'findFirst').mockResolvedValue(mockTodo as any);
      vi.spyOn(prisma.todo, 'update').mockResolvedValue(mockTodo as any);
      
      await new Promise<void>((resolve) => {
        clientSocket.on('todo:updated', (todo) => {
          expect(todo.id).toBe(mockTodo.id);
          expect(todo.title).toBe(mockTodo.title);
          resolve();
        });
        
        clientSocket.emit('todo:update', {
          id: 'todo-123',
          title: 'Updated Todo',
          completed: true,
        }, (response) => {
          expect(response.success).toBe(true);
        });
      });
    });
  });
  
  describe('Presence Events', () => {
    it('should update presence status', async () => {
      clientSocket.emit('presence:update', {
        status: 'online',
        lastActivity: new Date(),
        device: 'test-device',
      });
      
      // Since presence updates are broadcast to others, we can't directly test
      // the response on the same client. In a real test, we'd have multiple clients.
    });
    
    it('should handle typing indicators', async () => {
      // Start typing
      clientSocket.emit('presence:typing:start', 'todo-123');
      
      // Stop typing
      setTimeout(() => {
        clientSocket.emit('presence:typing:stop', 'todo-123');
      }, 100);
    });
  });
  
  describe('Activity Feed', () => {
    it('should subscribe to activity feed', async () => {
      clientSocket.emit('activity:subscribe');
      
      // In a real scenario, activity events would be triggered by todo operations
      // Here we're just testing the subscription mechanism
    });
    
    it('should unsubscribe from activity feed', async () => {
      clientSocket.emit('activity:unsubscribe');
    });
  });
});