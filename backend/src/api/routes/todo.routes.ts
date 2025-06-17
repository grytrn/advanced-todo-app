import { FastifyPluginAsync } from 'fastify';
import { TodoService } from '../../services/todo.service';
// Prisma will be accessed via app.prisma
import {
  createTodoSchema,
  updateTodoSchema,
  getTodoSchema,
  deleteTodoSchema,
  listTodosSchema,
  completeTodoSchema,
  reorderTodosSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  GetTodoSchema,
  DeleteTodoSchema,
  ListTodosSchema,
  CompleteTodoSchema,
  ReorderTodosSchema,
} from '../schemas/todo.schema';
import type {
  TodoResponse,
  TodoListResponse,
  TodosReorderResponse,
  TodoError,
} from '@shared/types/todo';

const todoRoutes: FastifyPluginAsync = async (app) => {
  const todoService = new TodoService(app.prisma);

  // All routes require authentication
  app.addHook('onRequest', app.authenticate);

  // Create todo
  app.post<{
    Body: CreateTodoSchema['body'];
    Reply: TodoResponse | TodoError;
  }>('/', {
    schema: {
      body: createTodoSchema.shape.body,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                todo: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const todo = await todoService.create(request.userId!, request.body);
    return reply.status(201).send({
      success: true,
      data: { todo },
    });
  });

  // List todos
  app.get<{
    Querystring: ListTodosSchema['query'];
    Reply: TodoListResponse | TodoError;
  }>('/', {
    schema: {
      querystring: listTodosSchema.shape.query,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                items: { type: 'array', items: { type: 'object' } },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    pages: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const result = await todoService.list(request.userId!, request.query);
    return reply.send({
      success: true,
      data: result,
    });
  });

  // Get single todo
  app.get<{
    Params: GetTodoSchema['params'];
    Reply: TodoResponse | TodoError;
  }>('/:id', {
    schema: {
      params: getTodoSchema.shape.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                todo: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const todo = await todoService.getById(request.userId!, request.params.id);
    return reply.send({
      success: true,
      data: { todo },
    });
  });

  // Update todo
  app.patch<{
    Params: UpdateTodoSchema['params'];
    Body: UpdateTodoSchema['body'];
    Reply: TodoResponse | TodoError;
  }>('/:id', {
    schema: {
      params: updateTodoSchema.shape.params,
      body: updateTodoSchema.shape.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                todo: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const todo = await todoService.update(
      request.userId!,
      request.params.id,
      request.body
    );
    return reply.send({
      success: true,
      data: { todo },
    });
  });

  // Delete todo
  app.delete<{
    Params: DeleteTodoSchema['params'];
    Reply: { success: true; data: null } | TodoError;
  }>('/:id', {
    schema: {
      params: deleteTodoSchema.shape.params,
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
    await todoService.delete(request.userId!, request.params.id);
    return reply.send({
      success: true,
      data: null,
    });
  });

  // Complete todo
  app.post<{
    Params: CompleteTodoSchema['params'];
    Reply: TodoResponse | TodoError;
  }>('/:id/complete', {
    schema: {
      params: completeTodoSchema.shape.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                todo: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const todo = await todoService.complete(request.userId!, request.params.id);
    return reply.send({
      success: true,
      data: { todo },
    });
  });

  // Uncomplete todo
  app.post<{
    Params: CompleteTodoSchema['params'];
    Reply: TodoResponse | TodoError;
  }>('/:id/uncomplete', {
    schema: {
      params: completeTodoSchema.shape.params,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                todo: { type: 'object' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const todo = await todoService.uncomplete(request.userId!, request.params.id);
    return reply.send({
      success: true,
      data: { todo },
    });
  });

  // Reorder todos
  app.post<{
    Body: ReorderTodosSchema['body'];
    Reply: TodosReorderResponse | TodoError;
  }>('/reorder', {
    schema: {
      body: reorderTodosSchema.shape.body,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean', const: true },
            data: {
              type: 'object',
              properties: {
                todos: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const todos = await todoService.reorder(request.userId!, request.body.todoIds);
    return reply.send({
      success: true,
      data: { todos },
    });
  });
};

export default todoRoutes;