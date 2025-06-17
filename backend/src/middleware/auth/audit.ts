import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../utils/logger';
import { AuthenticatedRequest } from './authenticate';

const logger = createLogger('audit-middleware');
const prisma = new PrismaClient();

interface AuditOptions {
  excludeRoutes?: string[];
  excludeMethods?: string[];
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields?: string[];
}

interface AuditContext {
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
}

/**
 * Extract resource info from request
 */
function extractResourceInfo(request: FastifyRequest): {
  resource?: string;
  resourceId?: string;
} {
  const urlParts = request.url.split('/').filter(Boolean);
  
  // Common REST patterns
  if (urlParts.includes('todos') && urlParts.length > urlParts.indexOf('todos') + 1) {
    return {
      resource: 'todo',
      resourceId: urlParts[urlParts.indexOf('todos') + 1].split('?')[0],
    };
  }
  
  if (urlParts.includes('categories') && urlParts.length > urlParts.indexOf('categories') + 1) {
    return {
      resource: 'category',
      resourceId: urlParts[urlParts.indexOf('categories') + 1].split('?')[0],
    };
  }
  
  if (urlParts.includes('users') && urlParts.length > urlParts.indexOf('users') + 1) {
    return {
      resource: 'user',
      resourceId: urlParts[urlParts.indexOf('users') + 1].split('?')[0],
    };
  }
  
  // Default to first URL segment as resource
  if (urlParts.length > 2) {
    return {
      resource: urlParts[2],
      resourceId: urlParts[3]?.split('?')[0],
    };
  }
  
  return {};
}

/**
 * Sanitize sensitive data
 */
function sanitizeData(data: any, sensitiveFields: string[]): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key], sensitiveFields);
    }
  }
  
  return sanitized;
}

/**
 * Audit logging plugin
 */
export async function auditLogging(
  app: FastifyInstance,
  options: AuditOptions = {}
) {
  const {
    excludeRoutes = ['/health', '/metrics', '/api/v1/auth/csrf-token'],
    excludeMethods = ['OPTIONS'],
    includeRequestBody = true,
    includeResponseBody = false,
    sensitiveFields = ['password', 'passwordHash', 'token', 'refreshToken', 'apiKey', 'secret'],
  } = options;

  // Add hook to log all requests
  app.addHook('onResponse', async (request, reply) => {
    // Skip excluded routes
    if (excludeRoutes.some(route => request.url.startsWith(route))) {
      return;
    }

    // Skip excluded methods
    if (excludeMethods.includes(request.method)) {
      return;
    }

    // Skip if no user (unauthenticated requests)
    const authRequest = request as AuthenticatedRequest;
    if (!authRequest.userId) {
      return;
    }

    try {
      // Extract resource info
      const { resource, resourceId } = extractResourceInfo(request);

      // Build audit details
      const details: any = {
        method: request.method,
        path: request.url.split('?')[0],
        statusCode: reply.statusCode,
        duration: reply.getResponseTime(),
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      };

      // Include request body if enabled
      if (includeRequestBody && request.body) {
        details.requestBody = sanitizeData(request.body, sensitiveFields);
      }

      // Include response body if enabled and available
      if (includeResponseBody && (reply as any).payload) {
        try {
          const responseBody = JSON.parse((reply as any).payload);
          details.responseBody = sanitizeData(responseBody, sensitiveFields);
        } catch (e) {
          // Response might not be JSON
        }
      }

      // Determine action based on method and path
      let action = `${request.method.toLowerCase()}.${resource || 'unknown'}`;
      
      // Special cases
      if (request.url.includes('/auth/login')) {
        action = 'user.login';
      } else if (request.url.includes('/auth/logout')) {
        action = 'user.logout';
      } else if (request.url.includes('/auth/register')) {
        action = 'user.register';
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: authRequest.userId,
          action,
          resource,
          resourceId,
          details,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] as string,
        },
      });
    } catch (error) {
      logger.error({ error, url: request.url }, 'Failed to create audit log');
    }
  });
}

/**
 * Manual audit logging helper
 */
export async function logAuditEvent(
  userId: string | null,
  action: string,
  context?: AuditContext
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: context?.resource,
        resourceId: context?.resourceId,
        details: context?.details,
      },
    });
  } catch (error) {
    logger.error({ error, userId, action }, 'Failed to create audit log');
  }
}

/**
 * Audit log middleware for specific routes
 */
export function auditAction(action: string, resourceExtractor?: (req: FastifyRequest) => AuditContext) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;
    
    // Extract context
    const context = resourceExtractor ? resourceExtractor(request) : {};
    
    // Log the action
    await logAuditEvent(authRequest.userId, action, {
      ...context,
      details: {
        ...context.details,
        method: request.method,
        path: request.url,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });
  };
}