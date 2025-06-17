import { FastifyPluginAsync } from 'fastify';
import { AuthService } from '../../services/auth.service';
import { prisma } from '../../index';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
  LogoutSchema,
} from '../schemas/auth.schema';
import type {
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  LogoutResponse,
  MeResponse,
  AuthError,
} from '@shared/types/auth';

const authRoutes: FastifyPluginAsync = async (app) => {
  const authService = new AuthService(prisma, app);

  // Register endpoint
  app.post<{
    Body: RegisterSchema['body'];
    Reply: RegisterResponse | AuthError;
  }>('/register', {
    schema: {
      body: registerSchema.shape.body,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                    avatar: { type: 'string', nullable: true },
                    bio: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                    emailVerified: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = await authService.register(request.body);
    return reply.status(201).send({
      success: true,
      data: { user },
    });
  });

  // Login endpoint
  app.post<{
    Body: LoginSchema['body'];
    Reply: LoginResponse | AuthError;
  }>('/login', {
    schema: {
      body: loginSchema.shape.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                    avatar: { type: 'string', nullable: true },
                    bio: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                    emailVerified: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const result = await authService.login(request.body);
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Refresh token endpoint
  app.post<{
    Body: RefreshTokenSchema['body'];
    Reply: RefreshTokenResponse | AuthError;
  }>('/refresh', {
    schema: {
      body: refreshTokenSchema.shape.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const result = await authService.refreshToken(request.body.refreshToken);
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Logout endpoint
  app.post<{
    Body: LogoutSchema['body'];
    Reply: LogoutResponse | AuthError;
  }>('/logout', {
    schema: {
      body: logoutSchema.shape.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    await authService.logout(request.body.refreshToken);
    return reply.send({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  });

  // Get current user endpoint (authenticated)
  app.get<{
    Reply: MeResponse | AuthError;
  }>('/me', {
    preHandler: [app.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    email: { type: 'string' },
                    name: { type: 'string' },
                    avatar: { type: 'string', nullable: true },
                    bio: { type: 'string', nullable: true },
                    isActive: { type: 'boolean' },
                    emailVerified: { type: 'boolean' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = await authService.getUserById(request.userId!);
    return reply.send({
      success: true,
      data: { user },
    });
  });
};

export default authRoutes;