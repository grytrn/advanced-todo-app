import { Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';
import { createLogger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';
import type { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../types';

const logger = createLogger('socket-auth');
const prisma = new PrismaClient();

export const authenticateSocket = (app: FastifyInstance) => {
  return async (socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, next: (err?: Error) => void) => {
    try {
      // Get token from handshake auth or query
      const token = socket.handshake.auth['token'] || socket.handshake.query['token'];
      
      if (!token) {
        logger.warn({ socketId: socket.id }, 'No token provided');
        return next(new Error('Authentication required'));
      }
      
      // Verify JWT token
      try {
        const decoded = app.jwt.verify(token as string) as { id: string; type: string };
        
        // Ensure it's an access token
        if (decoded.type !== 'access') {
          logger.warn({ socketId: socket.id }, 'Invalid token type');
          return next(new Error('Invalid token type'));
        }
        
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        
        if (!user) {
          logger.warn({ socketId: socket.id, userId: decoded.id }, 'User not found');
          return next(new Error('User not found'));
        }
        
        // Store user data in socket
        socket.data.userId = user.id;
        socket.data.user = user as any; // Type assertion needed due to partial selection
        
        logger.info({ socketId: socket.id, userId: user.id }, 'Socket authenticated');
        next();
      } catch (jwtError) {
        logger.warn({ socketId: socket.id, error: jwtError }, 'JWT verification failed');
        next(new Error('Invalid token'));
      }
    } catch (error) {
      logger.error({ socketId: socket.id, error }, 'Socket authentication error');
      next(new Error('Authentication failed'));
    }
  };
};