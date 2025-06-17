import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import { config } from '../../src/config';

describe('TODO Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let categoryId: string;

  const testUser = {
    email: `todo-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'TODO Test User',
  };

  beforeAll(async () => {
    app = await buildApp();
    prisma = new PrismaClient();
    
    // Register test user and get auth token
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: testUser,
    });
    
    const registerData = JSON.parse(registerResponse.body);
    authToken = registerData.data.accessToken;
    userId = registerData.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.todo.deleteMany({ where: { userId } });
    await prisma.category.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Create a test category
    const categoryResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: 'Test Category',
        color: '#FF5733',
        icon: '📝',
      },
    });
    
    const categoryData = JSON.parse(categoryResponse.body);
    categoryId = categoryData.data.category.id;
  });

  afterEach(async () => {
    // Clean up todos after each test
    await prisma.todo.deleteMany({ where: { userId } });
  });

  describe('POST /api/v1/todos', () => {
    it('should create a new todo with minimal data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Test TODO',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todo).toMatchObject({
        title: 'Test TODO',
        completed: false,
        priority: 'MEDIUM',
        status: 'PENDING',
      });
      expect(data.data.todo.id).toBeDefined();
      expect(data.data.todo.position).toBeDefined();
    });

    it('should create a todo with all fields', async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      const reminder = new Date(Date.now() + 82800000).toISOString(); // 1 hour before due
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Complete TODO',
          description: 'This is a detailed description',
          categoryId,
          tags: ['urgent', 'work', 'important'],
          dueDate,
          reminder,
          priority: 'HIGH',
          isRecurring: true,
          recurrence: 'WEEKLY',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todo).toMatchObject({
        title: 'Complete TODO',
        description: 'This is a detailed description',
        categoryId,
        priority: 'HIGH',
        isRecurring: true,
        recurrence: 'WEEKLY',
      });
      expect(data.data.todo.tags).toEqual(expect.arrayContaining(['urgent', 'work', 'important']));
      expect(new Date(data.data.todo.dueDate).toISOString()).toBe(dueDate);
      expect(new Date(data.data.todo.reminder).toISOString()).toBe(reminder);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate priority values', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Test TODO',
          priority: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        payload: {
          title: 'Test TODO',
        },
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/todos', () => {
    beforeEach(async () => {
      // Create test todos
      const todos = [
        { title: 'Low Priority Task', priority: 'LOW', status: 'PENDING' },
        { title: 'Medium Priority Task', priority: 'MEDIUM', status: 'IN_PROGRESS' },
        { title: 'High Priority Task', priority: 'HIGH', status: 'COMPLETED', categoryId },
        { title: 'Urgent Task', priority: 'URGENT', status: 'PENDING', tags: ['urgent'] },
        { title: 'Overdue Task', priority: 'HIGH', status: 'PENDING', dueDate: new Date(Date.now() - 86400000).toISOString() },
      ];

      for (const todo of todos) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: todo,
        });
      }
    });

    it('should list all todos with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.items).toHaveLength(5);
      expect(data.data.pagination).toMatchObject({
        page: 1,
        limit: 20,
        total: 5,
        pages: 1,
      });
    });

    it('should filter by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?status=PENDING',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(3);
      expect(data.data.items.every((todo: any) => todo.status === 'PENDING')).toBe(true);
    });

    it('should filter by priority', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?priority=HIGH',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(2);
      expect(data.data.items.every((todo: any) => todo.priority === 'HIGH')).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/todos?categoryId=${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].categoryId).toBe(categoryId);
    });

    it('should filter by overdue status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?isOverdue=true',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].title).toBe('Overdue Task');
    });

    it('should search by title', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?search=urgent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].title).toBe('Urgent Task');
    });

    it('should sort by priority descending', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?sortBy=priority&sortOrder=desc',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      const priorities = data.data.items.map((t: any) => t.priority);
      expect(priorities[0]).toBe('URGENT');
      expect(priorities[priorities.length - 1]).toBe('LOW');
    });

    it('should handle pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?page=1&limit=2',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(2);
      expect(data.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3,
      });
    });
  });

  describe('GET /api/v1/todos/:id', () => {
    let todoId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Test TODO',
          description: 'Test description',
          tags: ['test', 'sample'],
        },
      });
      
      const data = JSON.parse(response.body);
      todoId = data.data.todo.id;
    });

    it('should get a todo by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todo).toMatchObject({
        id: todoId,
        title: 'Test TODO',
        description: 'Test description',
      });
      expect(data.data.todo.tags).toEqual(['test', 'sample']);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should not access other users todos', async () => {
      // Create another user
      const otherUser = {
        email: `other-${Date.now()}@example.com`,
        password: 'Test123!@#',
        name: 'Other User',
      };
      
      const otherUserResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: otherUser,
      });
      
      const otherUserData = JSON.parse(otherUserResponse.body);
      const otherUserToken = otherUserData.data.accessToken;
      
      // Try to access the first user's todo with the other user's token
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      // Clean up other user
      await prisma.user.delete({ where: { id: otherUserData.data.user.id } });
    });
  });

  describe('PATCH /api/v1/todos/:id', () => {
    let todoId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Original Title',
          priority: 'LOW',
          status: 'PENDING',
        },
      });
      
      const data = JSON.parse(response.body);
      todoId = data.data.todo.id;
    });

    it('should update todo fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Updated Title',
          description: 'New description',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          tags: ['updated', 'modified'],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todo).toMatchObject({
        id: todoId,
        title: 'Updated Title',
        description: 'New description',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
      });
      expect(data.data.todo.tags).toEqual(['updated', 'modified']);
    });

    it('should clear optional fields', async () => {
      // First add optional fields
      await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: 'Some description',
          categoryId,
          dueDate: new Date().toISOString(),
        },
      });

      // Then clear them
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          description: null,
          categoryId: null,
          dueDate: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.todo.description).toBeNull();
      expect(data.data.todo.categoryId).toBeNull();
      expect(data.data.todo.dueDate).toBeNull();
    });

    it('should validate status transitions', async () => {
      // First complete the todo
      await app.inject({
        method: 'POST',
        url: `/api/v1/todos/${todoId}/complete`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Try to change to invalid status
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          status: 'INVALID_STATUS',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/todos/:id', () => {
    let todoId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'To be deleted',
        },
      });
      
      const data = JSON.parse(response.body);
      todoId = data.data.todo.id;
    });

    it('should delete a todo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data).toBeNull();

      // Verify deletion
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should return 404 for non-existent todo', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/todos/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/v1/todos/:id/complete', () => {
    let todoId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'To be completed',
          status: 'PENDING',
        },
      });
      
      const data = JSON.parse(response.body);
      todoId = data.data.todo.id;
    });

    it('should complete a todo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/todos/${todoId}/complete`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todo.status).toBe('COMPLETED');
      expect(data.data.todo.completedAt).toBeDefined();
    });

    it('should handle already completed todos', async () => {
      // Complete once
      await app.inject({
        method: 'POST',
        url: `/api/v1/todos/${todoId}/complete`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Try to complete again
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/todos/${todoId}/complete`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.todo.status).toBe('COMPLETED');
    });
  });

  describe('POST /api/v1/todos/:id/uncomplete', () => {
    let todoId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Completed todo',
          status: 'COMPLETED',
        },
      });
      
      const data = JSON.parse(response.body);
      todoId = data.data.todo.id;
      
      // Complete it first
      await app.inject({
        method: 'POST',
        url: `/api/v1/todos/${todoId}/complete`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
    });

    it('should uncomplete a todo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/todos/${todoId}/uncomplete`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todo.status).toBe('PENDING');
      expect(data.data.todo.completedAt).toBeNull();
    });
  });

  describe('POST /api/v1/todos/reorder', () => {
    let todoIds: string[] = [];

    beforeEach(async () => {
      // Create multiple todos
      const todos = [
        { title: 'First', position: 0 },
        { title: 'Second', position: 1 },
        { title: 'Third', position: 2 },
        { title: 'Fourth', position: 3 },
      ];

      for (const todo of todos) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: todo,
        });
        
        const data = JSON.parse(response.body);
        todoIds.push(data.data.todo.id);
      }
    });

    it('should reorder todos', async () => {
      // Reverse the order
      const newOrder = [...todoIds].reverse();
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos/reorder',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          todoIds: newOrder,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.todos).toHaveLength(4);
      
      // Verify the new order
      const positions = data.data.todos.map((t: any) => ({ id: t.id, position: t.position }));
      newOrder.forEach((id, index) => {
        const todo = positions.find((p: any) => p.id === id);
        expect(todo.position).toBe(index);
      });
    });

    it('should validate todo ownership', async () => {
      // Create another user's todo
      const otherUser = {
        email: `reorder-${Date.now()}@example.com`,
        password: 'Test123!@#',
        name: 'Other User',
      };
      
      const otherUserResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: otherUser,
      });
      
      const otherUserData = JSON.parse(otherUserResponse.body);
      const otherUserToken = otherUserData.data.accessToken;
      
      const otherTodoResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
        payload: {
          title: 'Other user todo',
        },
      });
      
      const otherTodoData = JSON.parse(otherTodoResponse.body);
      const otherTodoId = otherTodoData.data.todo.id;
      
      // Try to include other user's todo in reorder
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos/reorder',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          todoIds: [...todoIds, otherTodoId],
        },
      });

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      
      // Clean up other user
      await prisma.todo.deleteMany({ where: { userId: otherUserData.data.user.id } });
      await prisma.user.delete({ where: { id: otherUserData.data.user.id } });
    });
  });

  describe('Concurrent operations', () => {
    it('should handle concurrent todo creation', async () => {
      const promises = [];
      
      // Create 10 todos concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Concurrent TODO ${i}`,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
            },
          })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.body);
        expect(data.success).toBe(true);
      });
      
      // Verify all were created
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const listData = JSON.parse(listResponse.body);
      expect(listData.data.items.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent updates correctly', async () => {
      // Create a todo
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Concurrent Update Test',
          priority: 'LOW',
        },
      });
      
      const createData = JSON.parse(createResponse.body);
      const todoId = createData.data.todo.id;
      
      // Make concurrent updates
      const promises = [
        app.inject({
          method: 'PATCH',
          url: `/api/v1/todos/${todoId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            title: 'Updated Title 1',
          },
        }),
        app.inject({
          method: 'PATCH',
          url: `/api/v1/todos/${todoId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            priority: 'HIGH',
          },
        }),
        app.inject({
          method: 'PATCH',
          url: `/api/v1/todos/${todoId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            tags: ['concurrent', 'test'],
          },
        }),
      ];
      
      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
      
      // Get final state
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const getData = JSON.parse(getResponse.body);
      const finalTodo = getData.data.todo;
      
      // Should have the last update's values
      expect(finalTodo.priority).toBe('HIGH');
      expect(finalTodo.tags).toEqual(['concurrent', 'test']);
    });
  });
});