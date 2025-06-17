import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import { config } from './config';
import { logger } from './utils/logger';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    prisma: PrismaClient;
  }
  interface FastifyRequest {
    userId?: string;
    startTime?: number;
  }
}

// Create Fastify instance
export const buildApp = async (prisma: PrismaClient): Promise<FastifyInstance> => {
  const app = Fastify({
    logger,
    requestIdLogLabel: 'requestId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Add Prisma to the instance
  app.decorate('prisma', prisma);

  // Register core plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.register(fastifyRateLimit, {
    max: config.rateLimit.maxRequests,
    timeWindow: config.rateLimit.windowMs,
    errorResponseBuilder: () => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
      };
    },
  });

  await app.register(fastifyJwt, {
    secret: config.auth.jwt.secret,
    sign: {
      expiresIn: config.auth.jwt.expiresIn,
    },
  });

  // Register cookie plugin
  await app.register(fastifyCookie, {
    secret: config.auth.jwt.secret, // for signed cookies
  });

  // Authentication decorator
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      // The JWT plugin automatically adds the decoded payload to request.user
      // We'll extract userId from it
      const user = request.user as { id: string };
      request.userId = user.id;
    } catch (err) {
      reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
    }
  });

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    // Log the error
    request.log.error(error);

    // Handle validation errors
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.validation,
        },
      });
    }

    // Handle JWT errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header required',
        },
      });
    }

    // Handle other known errors
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : error.message;

    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message,
      },
    });
  });

  // Health check route
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
  }));

  // API version route
  app.get(`/api/${config.app.version}`, async () => ({
    name: config.app.name,
    version: config.app.version,
    documentation: `/api/${config.app.version}/docs`,
  }));

  // Request timing
  app.addHook('onRequest', async (request) => {
    request.startTime = Date.now();
  });

  app.addHook('onSend', async (request, reply) => {
    const responseTime = Date.now() - (request.startTime || Date.now());
    reply.header('X-Response-Time', `${responseTime}ms`);
  });

  return app as any;
};

// Graceful shutdown handler
export const gracefulShutdown = async (app: FastifyInstance) => {
  try {
    logger.info('Shutting down gracefully...');
    await app.close();
    logger.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    logger.error(err, 'Error during shutdown');
    process.exit(1);
  }
};