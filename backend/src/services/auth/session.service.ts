import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { config } from '../../config';
import { createLogger } from '../../utils/logger';
import { UnauthorizedError } from '../../utils/errors';

const logger = createLogger('session-service');

interface SessionData {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActivity: Date;
}

export class SessionService {
  private redis: Redis;
  private sessionTTL: number = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private prisma: PrismaClient,
    redisUrl?: string
  ) {
    this.redis = new Redis(redisUrl || config.redis.url);
    
    this.redis.on('error', (error) => {
      logger.error({ error }, 'Redis connection error');
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }

  /**
   * Create a new session
   */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    sessionId: string;
    sessionData: SessionData;
  }> {
    // Get user with roles and permissions
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Aggregate permissions
    const permissions = user.roles.reduce((acc, userRole) => {
      return [...acc, ...userRole.role.permissions];
    }, [] as string[]);

    const sessionId = randomUUID();
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      roles: user.roles.map(ur => ur.role.name),
      permissions: [...new Set(permissions)],
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Store in Redis
    await this.redis.setex(
      `session:${sessionId}`,
      this.sessionTTL,
      JSON.stringify(sessionData)
    );

    // Also track user's active sessions
    await this.redis.sadd(`user:${userId}:sessions`, sessionId);
    await this.redis.expire(`user:${userId}:sessions`, this.sessionTTL);

    logger.info({ userId, sessionId }, 'Session created');

    return { sessionId, sessionData };
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    const data = await this.redis.get(`session:${sessionId}`);
    
    if (!data) {
      return null;
    }

    try {
      const sessionData = JSON.parse(data) as SessionData;
      
      // Update last activity
      sessionData.lastActivity = new Date();
      await this.redis.setex(
        `session:${sessionId}`,
        this.sessionTTL,
        JSON.stringify(sessionData)
      );

      return sessionData;
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to parse session data');
      return null;
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (!session) {
      throw new UnauthorizedError('Session not found');
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastActivity: new Date(),
    };

    await this.redis.setex(
      `session:${sessionId}`,
      this.sessionTTL,
      JSON.stringify(updatedSession)
    );
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    
    if (session) {
      // Remove from Redis
      await this.redis.del(`session:${sessionId}`);
      
      // Remove from user's session set
      await this.redis.srem(`user:${session.userId}:sessions`, sessionId);
      
      logger.info({ userId: session.userId, sessionId }, 'Session deleted');
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    // Get all user sessions
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    
    if (sessionIds.length > 0) {
      // Delete all sessions
      const pipeline = this.redis.pipeline();
      
      for (const sessionId of sessionIds) {
        pipeline.del(`session:${sessionId}`);
      }
      
      pipeline.del(`user:${userId}:sessions`);
      
      await pipeline.exec();
      
      logger.info({ userId, count: sessionIds.length }, 'All user sessions deleted');
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<{
    sessionId: string;
    data: SessionData;
  }[]> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    const sessions: { sessionId: string; data: SessionData }[] = [];

    for (const sessionId of sessionIds) {
      const data = await this.getSession(sessionId);
      
      if (data) {
        sessions.push({ sessionId, data });
      } else {
        // Clean up invalid session reference
        await this.redis.srem(`user:${userId}:sessions`, sessionId);
      }
    }

    return sessions;
  }

  /**
   * Count active sessions
   */
  async countActiveSessions(): Promise<{
    total: number;
    byUser: Record<string, number>;
  }> {
    const keys = await this.redis.keys('session:*');
    const byUser: Record<string, number> = {};

    for (const key of keys) {
      const data = await this.redis.get(key);
      
      if (data) {
        try {
          const session = JSON.parse(data) as SessionData;
          byUser[session.userId] = (byUser[session.userId] || 0) + 1;
        } catch (error) {
          // Skip invalid sessions
        }
      }
    }

    return {
      total: keys.length,
      byUser,
    };
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Redis automatically expires keys, but we need to clean up the user session sets
    const userKeys = await this.redis.keys('user:*:sessions');
    let cleaned = 0;

    for (const userKey of userKeys) {
      const sessionIds = await this.redis.smembers(userKey);
      
      for (const sessionId of sessionIds) {
        const exists = await this.redis.exists(`session:${sessionId}`);
        
        if (!exists) {
          await this.redis.srem(userKey, sessionId);
          cleaned++;
        }
      }

      // If no sessions left, delete the set
      const remaining = await this.redis.scard(userKey);
      if (remaining === 0) {
        await this.redis.del(userKey);
      }
    }

    if (cleaned > 0) {
      logger.info({ cleaned }, 'Expired sessions cleaned up');
    }

    return cleaned;
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string): Promise<void> {
    const exists = await this.redis.exists(`session:${sessionId}`);
    
    if (exists) {
      await this.redis.expire(`session:${sessionId}`, this.sessionTTL);
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    uniqueUsers: number;
    averageSessionsPerUser: number;
    sessionsByHour: Record<string, number>;
  }> {
    const sessions = await this.redis.keys('session:*');
    const uniqueUsers = new Set<string>();
    const sessionsByHour: Record<string, number> = {};

    for (const key of sessions) {
      const data = await this.redis.get(key);
      
      if (data) {
        try {
          const session = JSON.parse(data) as SessionData;
          uniqueUsers.add(session.userId);
          
          const hour = new Date(session.createdAt).getHours();
          sessionsByHour[hour] = (sessionsByHour[hour] || 0) + 1;
        } catch (error) {
          // Skip invalid sessions
        }
      }
    }

    return {
      totalSessions: sessions.length,
      uniqueUsers: uniqueUsers.size,
      averageSessionsPerUser: uniqueUsers.size > 0 
        ? sessions.length / uniqueUsers.size 
        : 0,
      sessionsByHour,
    };
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}