import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { createLogger } from '../utils/logger';
import { 
  ConflictError, 
  UnauthorizedError, 
  NotFoundError,
  ValidationError 
} from '../utils/errors';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AccessTokenPayload,
  RefreshTokenPayload
} from '@shared/types/auth';

const logger = createLogger('auth-service');

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private app: FastifyInstance
  ) {}

  /**
   * Register a new user
   */
  async register({ email, password, name }: RegisterRequest): Promise<User> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    return {
      ...user,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
    } as User;
  }

  /**
   * Login user and create session
   */
  async login({ email, password }: LoginRequest): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    // Find user
    const userWithPassword = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!userWithPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!userWithPassword.isActive) {
      throw new UnauthorizedError('Account deactivated');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userWithPassword.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Create tokens
    const { accessToken, refreshToken, sessionId } = await this.createTokens(userWithPassword.id);

    // Store refresh token in database
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: userWithPassword.id,
        refreshToken,
        expiresAt: new Date(Date.now() + this.parseTimeString(config.auth.refresh.expiresIn || '7d')),
        ipAddress: '', // Would need to get from request
        userAgent: '', // Would need to get from request
      },
    });

    // Return user without password
    const { passwordHash, ...user } = userWithPassword;

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return {
      user: {
        ...user,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? undefined,
      } as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verify refresh token
      const payload = this.app.jwt.verify(refreshToken) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      // Find session
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
        include: { user: true },
      });

      if (!session || session.refreshToken !== refreshToken) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        // Delete expired session
        await this.prisma.session.delete({
          where: { id: session.id },
        });
        throw new UnauthorizedError('Refresh token expired');
      }

      // Check if user is still active
      if (!session.user.isActive) {
        throw new UnauthorizedError('Account deactivated');
      }

      // Create new tokens
      const tokens = await this.createTokens(session.userId);

      // Update session with new refresh token
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + this.parseTimeString(config.auth.refresh.expiresIn || '7d')),
        },
      });

      logger.info({ userId: session.userId }, 'Tokens refreshed successfully');

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      // Verify refresh token
      const payload = this.app.jwt.verify(refreshToken) as RefreshTokenPayload;

      // Delete session
      await this.prisma.session.delete({
        where: { id: payload.sessionId },
      });

      logger.info({ sessionId: payload.sessionId }, 'User logged out successfully');
    } catch (error) {
      // Silently fail - user is logging out anyway
      logger.warn({ error }, 'Error during logout');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account deactivated');
    }

    return {
      ...user,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
    } as User;
  }

  /**
   * Create access and refresh tokens
   */
  private async createTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const sessionId = randomUUID();

    // Create access token
    const accessTokenPayload: AccessTokenPayload = {
      id: user.id,
      email: user.email,
      type: 'access',
    };

    const accessToken = this.app.jwt.sign(accessTokenPayload, {
      expiresIn: config.auth.jwt.expiresIn,
    });

    // Create refresh token
    const refreshTokenPayload: RefreshTokenPayload = {
      id: user.id,
      sessionId,
      type: 'refresh',
    };

    const refreshToken = this.app.jwt.sign(refreshTokenPayload, {
      expiresIn: config.auth.refresh.expiresIn,
    });

    return { accessToken, refreshToken, sessionId };
  }

  /**
   * Parse time string (e.g., '7d', '15m') to milliseconds
   */
  private parseTimeString(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new ValidationError('Invalid time string format');
    }

    const [, value, unit] = match;
    const num = parseInt(value!, 10);

    switch (unit) {
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      case 'd': return num * 24 * 60 * 60 * 1000;
      default: throw new ValidationError('Invalid time unit');
    }
  }
}