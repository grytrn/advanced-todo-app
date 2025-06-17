import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';
import { hashToken } from '../../utils/auth/tokens';

const logger = createLogger('auth-middleware');
const prisma = new PrismaClient();

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  userEmail: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  apiKeyId?: string;
}

/**
 * Basic authentication middleware
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Check for API key first
    const apiKey = request.headers['x-api-key'] as string;
    if (apiKey) {
      await authenticateWithApiKey(request as AuthenticatedRequest, apiKey);
      return;
    }

    // Otherwise, use JWT authentication
    await request.jwtVerify();
    
    const payload = request.user as any;
    
    // Verify token type
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    // Attach user info to request
    const authRequest = request as AuthenticatedRequest;
    authRequest.userId = payload.id;
    authRequest.userEmail = payload.email;
    authRequest.roles = payload.roles || [];
    authRequest.permissions = payload.permissions || [];
    authRequest.sessionId = payload.sessionId;
  } catch (error) {
    logger.error({ error }, 'Authentication failed');
    
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    
    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Authenticate with API key
 */
async function authenticateWithApiKey(
  request: AuthenticatedRequest,
  apiKey: string
): Promise<void> {
  const hashedKey = hashToken(apiKey);
  
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!apiKeyRecord) {
    throw new UnauthorizedError('Invalid API key');
  }

  // Check if key is expired
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
    throw new UnauthorizedError('API key expired');
  }

  // Check if user is active
  if (!apiKeyRecord.user.isActive) {
    throw new UnauthorizedError('User account deactivated');
  }

  // Update last used timestamp
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  // Aggregate permissions
  const permissions = apiKeyRecord.user.roles.reduce((acc, userRole) => {
    return [...acc, ...userRole.role.permissions];
  }, [] as string[]);

  // Attach user info to request
  request.userId = apiKeyRecord.userId;
  request.userEmail = apiKeyRecord.user.email;
  request.roles = apiKeyRecord.user.roles.map(ur => ur.role.name);
  request.permissions = [...new Set(permissions)]; // Remove duplicates
  request.apiKeyId = apiKeyRecord.id;
}

/**
 * Require specific roles
 */
export function requireRoles(...requiredRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;
    
    // Check if user has any of the required roles
    const hasRole = requiredRoles.some(role => authRequest.roles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

/**
 * Require specific permissions
 */
export function requirePermissions(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(
      permission => authRequest.permissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

/**
 * Require verified email
 */
export async function requireVerifiedEmail(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;
  
  const user = await prisma.user.findUnique({
    where: { id: authRequest.userId },
    select: { emailVerified: true },
  });

  if (!user || !user.emailVerified) {
    throw new ForbiddenError('Email verification required');
  }
}

/**
 * Rate limit by user tier
 */
export function rateLimitByTier(
  defaultLimit: number,
  tierLimits: Record<string, number>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;
    
    // Determine rate limit based on user roles
    let limit = defaultLimit;
    
    for (const [role, roleLimit] of Object.entries(tierLimits)) {
      if (authRequest.roles.includes(role)) {
        limit = Math.max(limit, roleLimit);
      }
    }
    
    // Apply rate limit
    // This would integrate with your rate limiting solution
    // For now, we'll just attach it to the request
    (request as any).rateLimit = limit;
  };
}