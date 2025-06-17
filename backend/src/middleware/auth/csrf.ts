import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import { randomBytes } from 'crypto';
import { ForbiddenError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('csrf-middleware');

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

interface CSRFOptions {
  cookieName?: string;
  headerName?: string;
  sessionKey?: string;
  skipRoutes?: string[];
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}


/**
 * CSRF protection plugin
 */
export async function csrfProtection(
  app: FastifyInstance,
  options: CSRFOptions = {}
) {
  const {
    cookieName = CSRF_COOKIE,
    headerName = CSRF_HEADER,
    sessionKey = 'csrfSecret',
    skipRoutes = [],
    secure = process.env['NODE_ENV'] === 'production',
    sameSite = 'strict',
  } = options;

  // Add CSRF token generation route
  app.get('/api/v1/auth/csrf-token', async (request, _reply) => {
    const token = generateCSRFToken();
    
    // Store token in session
    if ((request as any).session) {
      (request as any).session[sessionKey] = token;
    }

    // Set cookie
    _reply.setCookie(cookieName, token, {
      httpOnly: false, // Must be accessible by JavaScript
      secure,
      sameSite,
      path: '/',
    });

    return _reply.send({ csrfToken: token });
  });

  // Add CSRF validation hook
  app.addHook('preHandler', async (request, _reply) => {
    // Skip CSRF check for safe methods
    if (SAFE_METHODS.includes(request.method)) {
      return;
    }

    // Skip specific routes
    if (skipRoutes.some(route => request.url.startsWith(route))) {
      return;
    }

    // Skip if no session (unauthenticated requests)
    const requestWithSession = request as any;
    if (!requestWithSession.session || !requestWithSession.session[sessionKey]) {
      return;
    }

    // Get CSRF token from header or body
    const token = request.headers[headerName] as string || 
                 (request.body as any)?._csrf ||
                 (request.query as any)?._csrf;

    if (!token) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'CSRF token missing');
      
      throw new ForbiddenError('CSRF token required');
    }

    // Validate token
    const sessionToken = (request as any).session[sessionKey];
    
    if (token !== sessionToken) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'CSRF token mismatch');
      
      throw new ForbiddenError('Invalid CSRF token');
    }
  });
}

/**
 * CSRF protection middleware for specific routes
 */
export function requireCSRFToken(options: CSRFOptions = {}) {
  const {
    headerName = CSRF_HEADER,
    sessionKey = 'csrfSecret',
  } = options;

  return async (request: FastifyRequest, _reply: FastifyReply) => {
    // Skip CSRF check for safe methods
    if (SAFE_METHODS.includes(request.method)) {
      return;
    }

    // Get CSRF token from header or body
    const token = request.headers[headerName] as string || 
                 (request.body as any)?._csrf ||
                 (request.query as any)?._csrf;

    if (!token) {
      throw new ForbiddenError('CSRF token required');
    }

    // Validate token against session
    if ((request as any).session && (request as any).session[sessionKey]) {
      const sessionToken = (request as any).session[sessionKey];
      
      if (token !== sessionToken) {
        throw new ForbiddenError('Invalid CSRF token');
      }
    } else {
      // For stateless CSRF protection, validate against a signed token
      // This would require additional implementation
      throw new ForbiddenError('Session required for CSRF protection');
    }
  };
}

/**
 * Double Submit Cookie CSRF protection
 */
export function doubleSubmitCSRF(options: CSRFOptions = {}) {
  const {
    cookieName = CSRF_COOKIE,
    headerName = CSRF_HEADER,
  } = options;

  return async (request: FastifyRequest, _reply: FastifyReply) => {
    // Skip CSRF check for safe methods
    if (SAFE_METHODS.includes(request.method)) {
      return;
    }

    // Get token from cookie
    const cookieToken = request.cookies[cookieName];
    
    if (!cookieToken) {
      throw new ForbiddenError('CSRF cookie not found');
    }

    // Get token from header
    const headerToken = request.headers[headerName] as string;
    
    if (!headerToken) {
      throw new ForbiddenError('CSRF header not found');
    }

    // Compare tokens
    if (cookieToken !== headerToken) {
      logger.warn({ 
        method: request.method, 
        url: request.url,
        ip: request.ip,
      }, 'CSRF double submit token mismatch');
      
      throw new ForbiddenError('CSRF token mismatch');
    }
  };
}