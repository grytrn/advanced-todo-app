import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { createLogger } from '../../utils/logger';
import { ValidationError, UnauthorizedError } from '../../utils/errors';
import type { User } from '@shared/types/auth';

const logger = createLogger('oauth-service');

// OAuth provider configurations
const OAUTH_PROVIDERS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v1/userinfo',
    scope: 'email profile',
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailUrl: 'https://api.github.com/user/emails',
    scope: 'user:email',
  },
};

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export class OAuthService {
  private configs: Record<string, OAuthConfig> = {};

  constructor(
    private prisma: PrismaClient,
    private app: FastifyInstance
  ) {}

  /**
   * Configure OAuth provider
   */
  configureProvider(provider: string, config: OAuthConfig): void {
    this.configs[provider] = config;
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthorizationUrl(provider: string, state: string): string {
    const providerConfig = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];
    if (!providerConfig) {
      throw new ValidationError(`Unsupported OAuth provider: ${provider}`);
    }

    const config = this.configs[provider];
    if (!config) {
      throw new ValidationError(`OAuth provider not configured: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: providerConfig.scope,
      state,
    });

    return `${providerConfig.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const providerConfig = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];
    if (!providerConfig) {
      throw new ValidationError(`Unsupported OAuth provider: ${provider}`);
    }

    const config = this.configs[provider];
    if (!config) {
      throw new ValidationError(`OAuth provider not configured: ${provider}`);
    }

    try {
      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(provider, code);

      // Get user info from provider
      const userInfo = await this.getUserInfo(provider, tokens.access_token);

      // Find or create user
      const { user, isNewUser } = await this.findOrCreateUser(provider, userInfo, tokens);

      // Create session tokens
      const { accessToken, refreshToken, sessionId } = await this.createTokens(user.id);

      // Store session
      await this.prisma.session.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Log audit event
      await this.createAuditLog(
        user.id,
        isNewUser ? 'user.oauth_register' : 'user.oauth_login',
        'user',
        user.id,
        { provider }
      );

      logger.info(
        { userId: user.id, provider, isNewUser },
        'OAuth authentication successful'
      );

      return {
        user,
        accessToken,
        refreshToken,
        isNewUser,
      };
    } catch (error) {
      logger.error({ error, provider }, 'OAuth authentication failed');
      throw new UnauthorizedError('OAuth authentication failed');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    provider: string,
    code: string
  ): Promise<any> {
    const providerConfig = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];
    const config = this.configs[provider];

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    });

    const response = await axios.post(providerConfig.tokenUrl, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });

    return response.data;
  }

  /**
   * Get user info from OAuth provider
   */
  private async getUserInfo(
    provider: string,
    accessToken: string
  ): Promise<OAuthUserInfo> {
    const providerConfig = OAUTH_PROVIDERS[provider as keyof typeof OAUTH_PROVIDERS];

    if (provider === 'google') {
      const response = await axios.get(providerConfig.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        avatar: response.data.picture,
      };
    }

    if (provider === 'github') {
      // Get user info
      const userResponse = await axios.get(providerConfig.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      // GitHub doesn't always provide email in user endpoint
      let email = userResponse.data.email;
      
      if (!email) {
        // Get primary email from emails endpoint
        const emailsResponse = await axios.get(providerConfig.emailUrl!, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        const primaryEmail = emailsResponse.data.find(
          (e: any) => e.primary && e.verified
        );

        if (!primaryEmail) {
          throw new ValidationError('No verified email found in GitHub account');
        }

        email = primaryEmail.email;
      }

      return {
        id: userResponse.data.id.toString(),
        email,
        name: userResponse.data.name || userResponse.data.login,
        avatar: userResponse.data.avatar_url,
      };
    }

    throw new ValidationError(`Unsupported OAuth provider: ${provider}`);
  }

  /**
   * Find or create user from OAuth info
   */
  private async findOrCreateUser(
    provider: string,
    userInfo: OAuthUserInfo,
    tokens: any
  ): Promise<{ user: User; isNewUser: boolean }> {
    // Check if OAuth account exists
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: userInfo.id,
        },
      },
      include: { user: true },
    });

    if (existingOAuth) {
      // Update tokens
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuth.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
        },
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: existingOAuth.userId },
        data: {
          lastLoginAt: new Date(),
        },
      });

      const { passwordHash, twoFactorSecret, backupCodes, ...user } = existingOAuth.user;
      return { user, isNewUser: false };
    }

    // Check if user with email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (existingUser) {
      // Link OAuth account to existing user
      await this.prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider,
          providerAccountId: userInfo.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000)
            : null,
          tokenType: tokens.token_type,
          scope: tokens.scope,
        },
      });

      // Update user info if needed
      const updateData: any = {
        lastLoginAt: new Date(),
        emailVerified: true, // OAuth providers verify email
      };

      if (!existingUser.avatar && userInfo.avatar) {
        updateData.avatar = userInfo.avatar;
      }

      await this.prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
      });

      const { passwordHash, twoFactorSecret, backupCodes, ...user } = existingUser;
      return { user, isNewUser: false };
    }

    // Create new user
    const newUser = await this.prisma.user.create({
      data: {
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.avatar,
        emailVerified: true, // OAuth providers verify email
        passwordHash: '', // No password for OAuth users
        lastLoginAt: new Date(),
        oauthAccounts: {
          create: {
            provider,
            providerAccountId: userInfo.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expires_in
              ? new Date(Date.now() + tokens.expires_in * 1000)
              : null,
            tokenType: tokens.token_type,
            scope: tokens.scope,
          },
        },
        roles: {
          create: {
            roleId: 'clr9vz1x00000user', // Default user role
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

    return { user: newUser, isNewUser: true };
  }

  /**
   * Unlink OAuth account
   */
  async unlinkOAuthAccount(
    userId: string,
    provider: string
  ): Promise<{ message: string }> {
    // Check if user has a password or other OAuth accounts
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: true },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    // Don't allow unlinking if it's the only auth method
    if (!user.passwordHash && user.oauthAccounts.length === 1) {
      throw new ValidationError(
        'Cannot unlink the only authentication method. Please set a password first.'
      );
    }

    // Find and delete OAuth account
    const oauthAccount = user.oauthAccounts.find(acc => acc.provider === provider);
    if (!oauthAccount) {
      throw new ValidationError(`No ${provider} account linked`);
    }

    await this.prisma.oAuthAccount.delete({
      where: { id: oauthAccount.id },
    });

    // Log audit event
    await this.createAuditLog(
      userId,
      'user.oauth_unlink',
      'oauth_account',
      oauthAccount.id,
      { provider }
    );

    logger.info({ userId, provider }, 'OAuth account unlinked');

    return { message: `${provider} account unlinked successfully` };
  }

  /**
   * Helper: Create session tokens
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
      throw new ValidationError('User not found');
    }

    const sessionId = crypto.randomUUID();

    // Aggregate permissions
    const permissions = user.roles.reduce((acc, userRole) => {
      return [...acc, ...userRole.role.permissions];
    }, [] as string[]);

    // Create access token
    const accessTokenPayload = {
      id: user.id,
      email: user.email,
      type: 'access',
      roles: user.roles.map(ur => ur.role.name),
      permissions: [...new Set(permissions)],
    };

    const accessToken = this.app.jwt.sign(accessTokenPayload, {
      expiresIn: '15m',
    });

    // Create refresh token
    const refreshTokenPayload = {
      id: user.id,
      sessionId,
      type: 'refresh',
    };

    const refreshToken = this.app.jwt.sign(refreshTokenPayload, {
      secret: process.env.REFRESH_TOKEN_SECRET!,
      expiresIn: '7d',
    });

    return { accessToken, refreshToken, sessionId };
  }

  /**
   * Helper: Create audit log
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
}