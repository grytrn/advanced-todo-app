import { FastifyPluginAsync } from 'fastify';
import { CategoryService } from '../../services/category.service';
import { prisma } from '../../index';
import {
  createCategorySchema,
  updateCategorySchema,
  getCategorySchema,
  deleteCategorySchema,
  CreateCategorySchema,
  UpdateCategorySchema,
  GetCategorySchema,
  DeleteCategorySchema,
} from '../schemas/category.schema';
import type {
  CategoryResponse,
  CategoryListResponse,
  CategoryError,
} from '@shared/types/category';

const categoryRoutes: FastifyPluginAsync = async (app) => {
  const categoryService = new CategoryService(prisma);

  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Create category
  app.post<{
    Body: CreateCategorySchema['body'];
    Reply: CategoryResponse | CategoryError;
  }>('/', {
    schema: {
      body: createCategorySchema.shape.body,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                category: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    color: { type: 'string' },
                    icon: { type: 'string', nullable: true },
                    userId: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    todosCount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const category = await categoryService.create(request.userId!, request.body);
    return reply.status(201).send({
      success: true,
      data: { category },
    });
  });

  // List categories
  app.get<{
    Reply: CategoryListResponse | CategoryError;
  }>('/', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                categories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      color: { type: 'string' },
                      icon: { type: 'string', nullable: true },
                      userId: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                      todosCount: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const categories = await categoryService.list(request.userId!);
    return reply.send({
      success: true,
      data: { categories },
    });
  });

  // Get single category
  app.get<{
    Params: GetCategorySchema['params'];
    Reply: CategoryResponse | CategoryError;
  }>('/:id', {
    schema: {
      params: getCategorySchema.shape.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                category: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    color: { type: 'string' },
                    icon: { type: 'string', nullable: true },
                    userId: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    todosCount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const category = await categoryService.getById(request.userId!, request.params.id);
    return reply.send({
      success: true,
      data: { category },
    });
  });

  // Update category
  app.patch<{
    Params: UpdateCategorySchema['params'];
    Body: UpdateCategorySchema['body'];
    Reply: CategoryResponse | CategoryError;
  }>('/:id', {
    schema: {
      params: updateCategorySchema.shape.params,
      body: updateCategorySchema.shape.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                category: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    color: { type: 'string' },
                    icon: { type: 'string', nullable: true },
                    userId: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    todosCount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const category = await categoryService.update(
      request.userId!,
      request.params.id,
      request.body
    );
    return reply.send({
      success: true,
      data: { category },
    });
  });

  // Delete category
  app.delete<{
    Params: DeleteCategorySchema['params'];
    Reply: { success: true; data: null } | CategoryError;
  }>('/:id', {
    schema: {
      params: deleteCategorySchema.shape.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: { type: 'null' },
          },
        },
      },
    },
  }, async (request, reply) => {
    await categoryService.delete(request.userId!, request.params.id);
    return reply.send({
      success: true,
      data: null,
    });
  });
};

export default categoryRoutes;