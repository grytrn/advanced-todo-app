import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';

describe('Category Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  const testUser = {
    email: `category-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Category Test User',
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
    await prisma.category.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up categories after each test
    await prisma.category.deleteMany({ where: { userId } });
  });

  describe('POST /api/v1/categories', () => {
    it('should create a new category', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Work',
          color: '#3B82F6',
          icon: '💼',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.category).toMatchObject({
        name: 'Work',
        color: '#3B82F6',
        icon: '💼',
      });
      expect(data.data.category.id).toBeDefined();
      expect(data.data.category.userId).toBe(userId);
    });

    it('should create category without icon', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Personal',
          color: '#10B981',
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.category.name).toBe('Personal');
      expect(data.data.category.icon).toBeNull();
    });

    it('should prevent duplicate category names for same user', async () => {
      // Create first category
      await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Duplicate',
          color: '#FF0000',
        },
      });

      // Try to create duplicate
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Duplicate',
          color: '#00FF00',
        },
      });

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_CATEGORY');
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          color: '#3B82F6',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate color format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Invalid Color',
          color: 'not-a-color',
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/categories', () => {
    beforeEach(async () => {
      // Create test categories
      const categories = [
        { name: 'Work', color: '#3B82F6', icon: '💼' },
        { name: 'Personal', color: '#10B981', icon: '🏠' },
        { name: 'Health', color: '#EF4444', icon: '🏃' },
        { name: 'Learning', color: '#F59E0B', icon: '📚' },
      ];

      for (const category of categories) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/categories',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: category,
        });
      }
    });

    it('should list all user categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.categories).toHaveLength(4);
      expect(data.data.categories.map((c: any) => c.name).sort()).toEqual([
        'Health',
        'Learning',
        'Personal',
        'Work',
      ]);
    });

    it('should not return other users categories', async () => {
      // Create another user
      const otherUser = {
        email: `other-category-${Date.now()}@example.com`,
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
      
      // Create category for other user
      await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
        payload: {
          name: 'Other User Category',
          color: '#000000',
        },
      });
      
      // Get categories for first user
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const data = JSON.parse(response.body);
      expect(data.data.categories).toHaveLength(4);
      expect(data.data.categories.every((c: any) => c.name !== 'Other User Category')).toBe(true);
      
      // Clean up other user
      await prisma.category.deleteMany({ where: { userId: otherUserData.data.user.id } });
      await prisma.user.delete({ where: { id: otherUserData.data.user.id } });
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Test Category',
          color: '#3B82F6',
          icon: '🧪',
        },
      });
      
      const data = JSON.parse(response.body);
      categoryId = data.data.category.id;
    });

    it('should get a category by id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.category).toMatchObject({
        id: categoryId,
        name: 'Test Category',
        color: '#3B82F6',
        icon: '🧪',
      });
    });

    it('should return 404 for non-existent category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/categories/non-existent-id',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should not access other users categories', async () => {
      // Create another user
      const otherUser = {
        email: `other-get-${Date.now()}@example.com`,
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
      
      // Try to access the first user's category with the other user's token
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
      
      // Clean up other user
      await prisma.user.delete({ where: { id: otherUserData.data.user.id } });
    });
  });

  describe('PATCH /api/v1/categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Original',
          color: '#000000',
          icon: '⭐',
        },
      });
      
      const data = JSON.parse(response.body);
      categoryId = data.data.category.id;
    });

    it('should update category fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Updated',
          color: '#FFFFFF',
          icon: '🌟',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.category).toMatchObject({
        id: categoryId,
        name: 'Updated',
        color: '#FFFFFF',
        icon: '🌟',
      });
    });

    it('should update partial fields', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          color: '#FF0000',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.category).toMatchObject({
        name: 'Original',
        color: '#FF0000',
        icon: '⭐',
      });
    });

    it('should clear icon field', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          icon: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.category.icon).toBeNull();
    });

    it('should prevent duplicate names when updating', async () => {
      // Create another category
      await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Existing',
          color: '#00FF00',
        },
      });

      // Try to update first category to have same name
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Existing',
        },
      });

      expect(response.statusCode).toBe(409);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('DUPLICATE_CATEGORY');
    });
  });

  describe('DELETE /api/v1/categories/:id', () => {
    let categoryId: string;

    beforeEach(async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'To Delete',
          color: '#FF0000',
        },
      });
      
      const data = JSON.parse(response.body);
      categoryId = data.data.category.id;
    });

    it('should delete a category', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/categories/${categoryId}`,
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
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      expect(getResponse.statusCode).toBe(404);
    });

    it('should handle category with todos', async () => {
      // Create a todo in the category
      await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Todo in category',
          categoryId,
        },
      });

      // Delete the category
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/categories/${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Check that todos are updated (categoryId set to null)
      const todosResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const todosData = JSON.parse(todosResponse.body);
      const todo = todosData.data.items.find((t: any) => t.title === 'Todo in category');
      expect(todo.categoryId).toBeNull();
    });

    it('should return 404 for non-existent category', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/categories/non-existent-id',
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

  describe('Category usage with TODOs', () => {
    let categoryIds: Record<string, string> = {};

    beforeEach(async () => {
      // Create multiple categories
      const categories = [
        { name: 'Urgent', color: '#EF4444' },
        { name: 'Important', color: '#F59E0B' },
        { name: 'Later', color: '#10B981' },
      ];

      for (const category of categories) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/categories',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: category,
        });
        
        const data = JSON.parse(response.body);
        categoryIds[category.name] = data.data.category.id;
      }
    });

    it('should filter todos by category', async () => {
      // Create todos in different categories
      await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Urgent Task',
          categoryId: categoryIds.Urgent,
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Important Task',
          categoryId: categoryIds.Important,
        },
      });

      // Filter by category
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/todos?categoryId=${categoryIds.Urgent}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(1);
      expect(data.data.items[0].title).toBe('Urgent Task');
      expect(data.data.items[0].categoryId).toBe(categoryIds.Urgent);
    });

    it('should move todo between categories', async () => {
      // Create todo in one category
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Moving Task',
          categoryId: categoryIds.Later,
        },
      });

      const createData = JSON.parse(createResponse.body);
      const todoId = createData.data.todo.id;

      // Move to another category
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          categoryId: categoryIds.Urgent,
        },
      });

      const updateData = JSON.parse(updateResponse.body);
      expect(updateData.data.todo.categoryId).toBe(categoryIds.Urgent);
    });
  });
});