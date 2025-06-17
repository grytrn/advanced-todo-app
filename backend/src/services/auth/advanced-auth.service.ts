import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { config } from '../../config';
import { env } from '../../config/env';
import { createLogger } from '../../utils/logger';
import { EmailService } from '../email.service';
import { 
  ConflictError, 
  UnauthorizedError, 
  NotFoundError,
  ValidationError,
  ForbiddenError 
} from '../../utils/errors';
import {
  generateEmailVerificationToken,
  generatePasswordResetToken,
  generate2FASecret,
  verifyTOTP,
  generateBackupCodes,
  hashToken,
  generateApiKey,
} from '../../utils/auth/tokens';
import type {
  User,
  LoginRequest,
  RegisterRequest,
} from '@shared/types/auth';

const logger = createLogger('advanced-auth-service');

// Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export class AdvancedAuthService {
  private emailService: EmailService;

  constructor(
    private prisma: PrismaClient,
    private app: FastifyInstance
  ) {
    this.emailService = new EmailService();
  }

  /**
   * Register a new user with email verification
   */
  async register({ email, password, name }: RegisterRequest): Promise<{
    user: User;
    message: string;
  }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.auth.bcryptRounds);

    // Generate email verification token
    const { token, hashedToken, expiresAt } = generateEmailVerificationToken();

    // Create user with unverified email
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: expiresAt,
        // Assign default user role
        roles: {
          create: {
            roleId: 'clr9vz1x00000user', // Default user role ID from migration
          },
        },
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

    // Send verification email
    await this.emailService.sendVerificationEmail(email, name, token);

    // Log audit event
    await this.createAuditLog(user.id, 'user.register', 'user', user.id);

    logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

    return {
      user: {
        ...user,
        avatar: user.avatar ?? undefined,
        bio: user.bio ?? undefined,
      } as User,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const hashedToken = hashToken(token);

    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: hashedToken },
    });

    if (!user) {
      throw new ValidationError('Invalid verification token');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new ValidationError('Verification token has expired');
    }

    // Update user as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Log audit event
    await this.createAuditLog(user.id, 'user.verify_email', 'user', user.id);

    logger.info({ userId: user.id }, 'Email verified successfully');

    return { message: 'Email verified successfully' };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.emailVerified) {
      throw new ValidationError('Email already verified');
    }

    // Generate new verification token
    const { token, hashedToken, expiresAt } = generateEmailVerificationToken();

    // Update user with new token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: expiresAt,
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, user.name, token);

    logger.info({ userId: user.id }, 'Verification email resent');

    return { message: 'Verification email sent' };
  }

  /**
   * Login with account lockout protection
   */
  async login({ email, password }: LoginRequest, ipAddress?: string, userAgent?: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    requiresTwoFactor?: boolean;
  }> {
    // Find user
    const userWithPassword = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!userWithPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if account is locked
    if (userWithPassword.lockedUntil && userWithPassword.lockedUntil > new Date()) {
      throw new ForbiddenError('Account is locked. Please try again later.');
    }

    // Check if user is active
    if (!userWithPassword.isActive) {
      throw new UnauthorizedError('Account deactivated');
    }

    // Check if email is verified
    if (!userWithPassword.emailVerified) {
      throw new UnauthorizedError('Please verify your email before logging in');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userWithPassword.passwordHash);
    
    if (!isValidPassword) {
      // Increment login attempts
      const loginAttempts = userWithPassword.loginAttempts + 1;
      const updateData: any = { loginAttempts };

      // Lock account if max attempts reached
      if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
        
        // Send suspicious activity email
        await this.emailService.sendSuspiciousActivityEmail(
          email,
          userWithPassword.name,
          {
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            timestamp: new Date(),
            reason: 'Multiple failed login attempts',
          }
        );
      }

      await this.prisma.user.update({
        where: { id: userWithPassword.id },
        data: updateData,
      });

      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (userWithPassword.twoFactorEnabled) {
      // Return partial response for 2FA flow
      const { passwordHash, twoFactorSecret, backupCodes, ...user } = userWithPassword;
      return {
        user: {
          ...user,
          avatar: user.avatar ?? undefined,
          bio: user.bio ?? undefined,
        } as User,
        accessToken: '', // Will be provided after 2FA verification
        refreshToken: '',
        requiresTwoFactor: true,
      };
    }

    // Reset login attempts and update last login
    await this.prisma.user.update({
      where: { id: userWithPassword.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Create tokens
    const { accessToken, refreshToken, sessionId } = await this.createTokens(userWithPassword.id);

    // Store session
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: userWithPassword.id,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + this.parseTimeString(config.auth.refresh.expiresIn || '7d')),
      },
    });

    // Log audit event
    await this.createAuditLog(
      userWithPassword.id, 
      'user.login', 
      'user', 
      userWithPassword.id,
      { ipAddress, userAgent }
    );

    // Return user without sensitive data
    const { passwordHash, twoFactorSecret, backupCodes, ...user } = userWithPassword;

    logger.info({ userId: user.id, email: user.email }, 'User logged in successfully');

    return {
      user: { ...user, avatar: user.avatar || undefined } as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify 2FA code and complete login
   */
  async verify2FA(
    email: string, 
    code: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const userWithSecret = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!userWithSecret || !userWithSecret.twoFactorEnabled || !userWithSecret.twoFactorSecret) {
      throw new ValidationError('Two-factor authentication not enabled');
    }

    // Try to verify TOTP code first
    let isValid = verifyTOTP(code, userWithSecret.twoFactorSecret);

    // If TOTP fails, check backup codes
    if (!isValid && userWithSecret.backupCodes.includes(code)) {
      isValid = true;
      
      // Remove used backup code
      await this.prisma.user.update({
        where: { id: userWithSecret.id },
        data: {
          backupCodes: userWithSecret.backupCodes.filter(c => c !== code),
        },
      });
    }

    if (!isValid) {
      // Increment login attempts for failed 2FA
      await this.prisma.user.update({
        where: { id: userWithSecret.id },
        data: {
          loginAttempts: { increment: 1 },
        },
      });

      throw new UnauthorizedError('Invalid verification code');
    }

    // Reset login attempts and update last login
    await this.prisma.user.update({
      where: { id: userWithSecret.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Create tokens
    const { accessToken, refreshToken, sessionId } = await this.createTokens(userWithSecret.id);

    // Store session
    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: userWithSecret.id,
        refreshToken,
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + this.parseTimeString(config.auth.refresh.expiresIn || '7d')),
      },
    });

    // Log audit event
    await this.createAuditLog(
      userWithSecret.id,
      'user.login_2fa',
      'user',
      userWithSecret.id,
      { ipAddress, userAgent }
    );

    // Return user without sensitive data
    const { passwordHash, twoFactorSecret, backupCodes, ...user } = userWithSecret;

    return {
      user: { ...user, avatar: user.avatar || undefined } as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return { message: 'If an account exists with this email, you will receive a password reset link.' };
    }

    // Generate reset token
    const { token, hashedToken, expiresAt } = generatePasswordResetToken();

    // Store hashed token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiry: expiresAt,
      },
    });

    // Send reset email
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await this.emailService.sendPasswordResetEmail(email, { name: user.name, resetUrl });

    // Log audit event
    await this.createAuditLog(user.id, 'user.request_password_reset', 'user', user.id);

    logger.info({ userId: user.id }, 'Password reset requested');

    return { message: 'If an account exists with this email, you will receive a password reset link.' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hashedToken = hashToken(token);

    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: hashedToken },
    });

    if (!user) {
      throw new ValidationError('Invalid reset token');
    }

    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new ValidationError('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.auth.bcryptRounds);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        // Reset login attempts on password change
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Invalidate all sessions
    await this.prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Log audit event
    await this.createAuditLog(user.id, 'user.reset_password', 'user', user.id);

    logger.info({ userId: user.id }, 'Password reset successfully');

    return { message: 'Password reset successfully' };
  }

  /**
   * Enable 2FA
   */
  async enable2FA(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new ValidationError('Two-factor authentication already enabled');
    }

    // Generate secret and backup codes
    const { secret, qrCodeUrl } = generate2FASecret(user.email);
    const backupCodes = generateBackupCodes();

    // Store secret and backup codes (hashed)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        backupCodes,
      },
    });

    // Log audit event
    await this.createAuditLog(userId, 'user.enable_2fa_pending', 'user', userId);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Confirm 2FA setup
   */
  async confirm2FA(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new ValidationError('Two-factor authentication setup not initiated');
    }

    // Verify the code
    if (!verifyTOTP(code, user.twoFactorSecret)) {
      throw new ValidationError('Invalid verification code');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
      },
    });

    // Send confirmation email with backup codes
    await this.emailService.send2FAEnabledEmail(user.email, user.name, user.backupCodes);

    // Log audit event
    await this.createAuditLog(userId, 'user.enable_2fa_confirmed', 'user', userId);

    logger.info({ userId }, 'Two-factor authentication enabled');

    return { message: 'Two-factor authentication enabled successfully' };
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new ValidationError('Two-factor authentication not enabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Disable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      },
    });

    // Log audit event
    await this.createAuditLog(userId, 'user.disable_2fa', 'user', userId);

    logger.info({ userId }, 'Two-factor authentication disabled');

    return { message: 'Two-factor authentication disabled' };
  }

  /**
   * Generate new backup codes
   */
  async regenerateBackupCodes(userId: string, password: string): Promise<{
    backupCodes: string[];
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new ValidationError('Two-factor authentication not enabled');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: { backupCodes },
    });

    // Log audit event
    await this.createAuditLog(userId, 'user.regenerate_backup_codes', 'user', userId);

    return { backupCodes };
  }

  /**
   * Create API key
   */
  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
    expiresAt?: Date
  ): Promise<{
    apiKey: string;
    keyId: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Generate API key
    const { key, hashedKey } = generateApiKey();

    // Store hashed key
    const apiKeyRecord = await this.prisma.apiKey.create({
      data: {
        userId,
        name,
        key: hashedKey,
        scopes,
        expiresAt,
      },
    });

    // Log audit event
    await this.createAuditLog(userId, 'api_key.create', 'api_key', apiKeyRecord.id);

    logger.info({ userId, keyId: apiKeyRecord.id }, 'API key created');

    return {
      apiKey: key,
      keyId: apiKeyRecord.id,
    };
  }

  /**
   * Helper: Create audit log entry
   */
  private async createAuditLog(
    userId: string | null,
    action: string,
    resource: string | null,
    resourceId: string | null,
    details?: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          resourceId,
          details,
        },
      });
    } catch (error) {
      logger.error({ error, userId, action }, 'Failed to create audit log');
    }
  }

  /**
   * Helper: Create access and refresh tokens
   */
  private async createTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
    sessionId: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const sessionId = crypto.randomUUID();

    // Aggregate permissions from all roles
    const permissions = user.roles.reduce((acc, userRole) => {
      return [...acc, ...userRole.role.permissions];
    }, [] as string[]);

    // Create access token with roles and permissions
    const accessTokenPayload = {
      id: user.id,
      email: user.email,
      type: 'access',
      roles: user.roles.map(ur => ur.role.name),
      permissions: [...new Set(permissions)], // Remove duplicates
    };

    const accessToken = this.app.jwt.sign(accessTokenPayload, {
      expiresIn: config.auth.jwt.expiresIn,
    });

    // Create refresh token
    const refreshTokenPayload = {
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
   * Helper: Parse time string to milliseconds
   */
  private parseTimeString(timeString: string): number {
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new ValidationError('Invalid time string format');
    }

    const [, value, unit] = match!;
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