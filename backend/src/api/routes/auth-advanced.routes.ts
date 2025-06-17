import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AdvancedAuthService } from '../../services/auth/advanced-auth.service';
import { OAuthService } from '../../services/auth/oauth.service';
import { SessionService } from '../../services/auth/session.service';
import { env } from '../../config/env';
import { 
  authenticate, 
  requireVerifiedEmail,
  auditAction,
  type AuthenticatedRequest 
} from '../../middleware/auth';
import type { RegisterRequest } from '@shared/types/auth';
import { generateCSRFToken } from '../../middleware/auth/csrf';

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ),
  name: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const verify2FASchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain uppercase, lowercase, number and special character'
  ),
});

const enable2FASchema = z.object({
  code: z.string().length(6),
});

const disable2FASchema = z.object({
  password: z.string(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()),
  expiresAt: z.string().datetime().optional(),
});

const advancedAuthRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AdvancedAuthService(app.prisma, app);
  const oauthService = new OAuthService(app.prisma, app);
  const sessionService = new SessionService(app.prisma);

  // Configure OAuth providers
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    oauthService.configureProvider('google', {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${env.FRONTEND_URL}/auth/google/callback`,
    });
  }

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    oauthService.configureProvider('github', {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      redirectUri: `${env.FRONTEND_URL}/auth/github/callback`,
    });
  }

  // Register with email verification
  app.post('/register', {
    schema: {
      body: registerSchema,
    },
  }, async (request, reply) => {
    const result = await authService.register(request.body as RegisterRequest);
    return reply.status(201).send({
      success: true,
      data: result,
    });
  });

  // Verify email
  app.get('/verify-email', {
    schema: {
      querystring: z.object({
        token: z.string(),
      }),
    },
  }, async (request, reply) => {
    const { token } = request.query as { token: string };
    const result = await authService.verifyEmail(token);
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Resend verification email
  app.post('/resend-verification', {
    schema: {
      body: z.object({
        email: z.string().email(),
      }),
    },
  }, async (request, reply) => {
    const result = await authService.resendVerificationEmail((request.body as { email: string }).email);
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Login with 2FA support
  app.post('/login', {
    schema: {
      body: loginSchema,
    },
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof loginSchema>;
    const result = await authService.login(
      body,
      request.ip,
      request.headers['user-agent'] as string
    );

    // Set CSRF token
    const csrfToken = generateCSRFToken();
    reply.setCookie('csrf-token', csrfToken, {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return reply.send({
      success: true,
      data: {
        ...result,
        csrfToken,
      },
    });
  });

  // Verify 2FA code
  app.post('/verify-2fa', {
    schema: {
      body: verify2FASchema,
    },
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof verify2FASchema>;
    const result = await authService.verify2FA(
      body.email,
      body.code,
      request.ip,
      request.headers['user-agent'] as string
    );

    // Set CSRF token
    const csrfToken = generateCSRFToken();
    reply.setCookie('csrf-token', csrfToken, {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return reply.send({
      success: true,
      data: {
        ...result,
        csrfToken,
      },
    });
  });

  // Request password reset
  app.post('/forgot-password', {
    schema: {
      body: z.object({
        email: z.string().email(),
      }),
    },
  }, async (request, reply) => {
    const body = request.body as { email: string };
    const result = await authService.requestPasswordReset(body.email);
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Reset password
  app.post('/reset-password', {
    schema: {
      body: resetPasswordSchema,
    },
  }, async (request, reply) => {
    const body = request.body as z.infer<typeof resetPasswordSchema>;
    const result = await authService.resetPassword(
      body.token,
      body.password
    );
    return reply.send({
      success: true,
      data: result,
    });
  });

  // OAuth routes
  app.get('/oauth/:provider', {
    schema: {
      params: z.object({
        provider: z.enum(['google', 'github']),
      }),
    },
  }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const state = generateCSRFToken(); // Use as state parameter
    
    // Store state in session or cookie for verification
    reply.setCookie('oauth-state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    const authUrl = oauthService.getAuthorizationUrl(provider, state);
    return reply.redirect(authUrl);
  });

  // OAuth callback
  app.get('/oauth/:provider/callback', {
    schema: {
      params: z.object({
        provider: z.enum(['google', 'github']),
      }),
      querystring: z.object({
        code: z.string(),
        state: z.string(),
      }),
    },
  }, async (request, reply) => {
    const { provider } = request.params as { provider: string };
    const { code, state } = request.query as { code: string; state: string };

    // Verify state parameter
    const savedState = request.cookies['oauth-state'];
    if (!savedState || savedState !== state) {
      throw new Error('Invalid OAuth state');
    }

    const result = await oauthService.handleCallback(provider, code, state);

    // Clear state cookie
    reply.clearCookie('oauth-state');

    // Set CSRF token
    const csrfToken = generateCSRFToken();
    reply.setCookie('csrf-token', csrfToken, {
      httpOnly: false,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return reply.send({
      success: true,
      data: {
        ...result,
        csrfToken,
      },
    });
  });

  // Protected routes below
  
  // Get current user with sessions
  app.get('/me', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    
    const user = await app.prisma.user.findUnique({
      where: { id: authRequest.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        bio: true,
        isActive: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    const sessions = await sessionService.getUserSessions(authRequest.userId);

    return reply.send({
      success: true,
      data: {
        user,
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          ipAddress: s.data.ipAddress,
          userAgent: s.data.userAgent,
          createdAt: s.data.createdAt,
          lastActivity: s.data.lastActivity,
          current: s.sessionId === authRequest.sessionId,
        })),
      },
    });
  });

  // Enable 2FA - Step 1: Get QR code
  app.post('/2fa/enable', {
    preHandler: [authenticate, requireVerifiedEmail],
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const result = await authService.enable2FA(authRequest.userId);
    
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Enable 2FA - Step 2: Confirm with code
  app.post('/2fa/confirm', {
    preHandler: [authenticate, requireVerifiedEmail],
    schema: {
      body: enable2FASchema,
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const body = request.body as z.infer<typeof enable2FASchema>;
    const result = await authService.confirm2FA(
      authRequest.userId,
      body.code
    );
    
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Disable 2FA
  app.post('/2fa/disable', {
    preHandler: [authenticate],
    schema: {
      body: disable2FASchema,
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const body = request.body as z.infer<typeof disable2FASchema>;
    const result = await authService.disable2FA(
      authRequest.userId,
      body.password
    );
    
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Regenerate backup codes
  app.post('/2fa/backup-codes', {
    preHandler: [authenticate],
    schema: {
      body: disable2FASchema, // Reuse password schema
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const body = request.body as z.infer<typeof disable2FASchema>;
    const result = await authService.regenerateBackupCodes(
      authRequest.userId,
      body.password
    );
    
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Create API key
  app.post('/api-keys', {
    preHandler: [
      authenticate,
      requireVerifiedEmail,
      auditAction('api_key.create'),
    ],
    schema: {
      body: createApiKeySchema,
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const body = request.body as z.infer<typeof createApiKeySchema>;
    const { name, scopes, expiresAt } = body;
    
    const result = await authService.createApiKey(
      authRequest.userId,
      name,
      scopes,
      expiresAt ? new Date(expiresAt) : undefined
    );
    
    return reply.send({
      success: true,
      data: result,
    });
  });

  // List API keys
  app.get('/api-keys', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    
    const apiKeys = await app.prisma.apiKey.findMany({
      where: { userId: authRequest.userId },
      select: {
        id: true,
        name: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return reply.send({
      success: true,
      data: { apiKeys },
    });
  });

  // Delete API key
  app.delete('/api-keys/:keyId', {
    preHandler: [
      authenticate,
      auditAction('api_key.delete'),
    ],
    schema: {
      params: z.object({
        keyId: z.string(),
      }),
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { keyId } = request.params as { keyId: string };
    
    await app.prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId: authRequest.userId,
      },
    });
    
    return reply.send({
      success: true,
      data: { message: 'API key deleted successfully' },
    });
  });

  // Unlink OAuth account
  app.delete('/oauth/:provider', {
    preHandler: [authenticate],
    schema: {
      params: z.object({
        provider: z.enum(['google', 'github']),
      }),
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { provider } = request.params as { provider: string };
    
    const result = await oauthService.unlinkOAuthAccount(
      authRequest.userId,
      provider
    );
    
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Terminate session
  app.delete('/sessions/:sessionId', {
    preHandler: [authenticate],
    schema: {
      params: z.object({
        sessionId: z.string(),
      }),
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { sessionId } = request.params as { sessionId: string };
    
    // Verify session belongs to user
    const sessions = await sessionService.getUserSessions(authRequest.userId);
    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }
    
    await sessionService.deleteSession(sessionId);
    
    return reply.send({
      success: true,
      data: { message: 'Session terminated successfully' },
    });
  });

  // Terminate all sessions
  app.delete('/sessions', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    
    await sessionService.deleteUserSessions(authRequest.userId);
    
    return reply.send({
      success: true,
      data: { message: 'All sessions terminated successfully' },
    });
  });

  // Get audit logs
  app.get('/audit-logs', {
    preHandler: [authenticate],
    schema: {
      querystring: z.object({
        page: z.string().transform(Number).default('1'),
        limit: z.string().transform(Number).default('20'),
        action: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    },
  }, async (request, reply) => {
    const authRequest = request as AuthenticatedRequest;
    const { page, limit, action, startDate, endDate } = request.query as any;
    
    const where: any = { userId: authRequest.userId };
    
    if (action) {
      where.action = action;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const [logs, total] = await Promise.all([
      app.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      app.prisma.auditLog.count({ where }),
    ]);
    
    return reply.send({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  });
};

export default advancedAuthRoutes;