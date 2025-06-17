import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';

describe('Tag Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  const testUser = {
    email: `tag-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Tag Test User',
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
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up todos after each test
    await prisma.todo.deleteMany({ where: { userId } });
  });

  describe('GET /api/v1/tags', () => {
    beforeEach(async () => {
      // Create todos with various tags
      const todos = [
        { title: 'Task 1', tags: ['urgent', 'work', 'meeting'] },
        { title: 'Task 2', tags: ['work', 'project'] },
        { title: 'Task 3', tags: ['personal', 'health'] },
        { title: 'Task 4', tags: ['urgent', 'personal'] },
        { title: 'Task 5', tags: ['work', 'meeting', 'project'] },
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

    it('should list all unique tags for user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.tags.sort()).toEqual([
        'health',
        'meeting',
        'personal',
        'project',
        'urgent',
        'work',
      ]);
    });

    it('should return empty array when no todos have tags', async () => {
      // Clear todos
      await prisma.todo.deleteMany({ where: { userId } });

      // Create todo without tags
      await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'No tags',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.tags).toEqual([]);
    });

    it('should not return other users tags', async () => {
      // Create another user
      const otherUser = {
        email: `other-tag-${Date.now()}@example.com`,
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
      
      // Create todo with unique tag for other user
      await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
        payload: {
          title: 'Other user todo',
          tags: ['other-user-tag'],
        },
      });
      
      // Get tags for first user
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const data = JSON.parse(response.body);
      expect(data.data.tags).not.toContain('other-user-tag');
      
      // Clean up other user
      await prisma.todo.deleteMany({ where: { userId: otherUserData.data.user.id } });
      await prisma.user.delete({ where: { id: otherUserData.data.user.id } });
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags',
      });

      expect(response.statusCode).toBe(401);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/tags/popular', () => {
    beforeEach(async () => {
      // Create todos with various tags to establish popularity
      const todos = [
        { title: 'Task 1', tags: ['work', 'urgent', 'meeting'] },
        { title: 'Task 2', tags: ['work', 'project'] },
        { title: 'Task 3', tags: ['work', 'meeting'] },
        { title: 'Task 4', tags: ['personal'] },
        { title: 'Task 5', tags: ['urgent'] },
        { title: 'Task 6', tags: ['work'] },
        { title: 'Task 7', tags: ['meeting'] },
        { title: 'Task 8', tags: ['health'] },
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

    it('should return popular tags with counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags/popular',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      
      // Verify the most popular tag
      expect(data.data.tags[0]).toEqual({ name: 'work', count: 4 });
      
      // Verify other popular tags
      const tagMap = data.data.tags.reduce((acc: any, tag: any) => {
        acc[tag.name] = tag.count;
        return acc;
      }, {});
      
      expect(tagMap.meeting).toBe(3);
      expect(tagMap.urgent).toBe(2);
      expect(tagMap.personal).toBe(1);
      expect(tagMap.project).toBe(1);
      expect(tagMap.health).toBe(1);
    });

    it('should limit results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags/popular?limit=3',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.tags).toHaveLength(3);
      
      // Should be the top 3 most popular
      expect(data.data.tags[0].name).toBe('work');
      expect(data.data.tags[1].name).toBe('meeting');
      expect(data.data.tags[2].name).toBe('urgent');
    });

    it('should handle large limit gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags/popular?limit=100',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      // Should return all unique tags (6 in our test data)
      expect(data.data.tags).toHaveLength(6);
    });

    it('should return empty array when no tags exist', async () => {
      // Clear todos
      await prisma.todo.deleteMany({ where: { userId } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags/popular',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.success).toBe(true);
      expect(data.data.tags).toEqual([]);
    });
  });

  describe('Tag filtering in todos', () => {
    beforeEach(async () => {
      // Create todos with specific tags
      const todos = [
        { title: 'Urgent Work', tags: ['urgent', 'work'] },
        { title: 'Urgent Personal', tags: ['urgent', 'personal'] },
        { title: 'Work Project', tags: ['work', 'project'] },
        { title: 'Personal Health', tags: ['personal', 'health'] },
        { title: 'No Tags' },
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

    it('should filter todos by single tag', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?tag=urgent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(2);
      expect(data.data.items.every((todo: any) => todo.tags.includes('urgent'))).toBe(true);
    });

    it('should handle tag search case-insensitively', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?tag=WORK',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(2);
      expect(data.data.items.every((todo: any) => todo.tags.includes('work'))).toBe(true);
    });

    it('should return empty when filtering by non-existent tag', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?tag=nonexistent',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(0);
    });
  });

  describe('Tag management in todos', () => {
    it('should add tags when creating todo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Tagged Task',
          tags: ['alpha', 'beta', 'gamma'],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.todo.tags).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('should update tags when updating todo', async () => {
      // Create todo with initial tags
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Update Tags Test',
          tags: ['old', 'obsolete'],
        },
      });

      const createData = JSON.parse(createResponse.body);
      const todoId = createData.data.todo.id;

      // Update with new tags
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          tags: ['new', 'fresh', 'updated'],
        },
      });

      const updateData = JSON.parse(updateResponse.body);
      expect(updateData.data.todo.tags).toEqual(['new', 'fresh', 'updated']);
    });

    it('should remove all tags when setting empty array', async () => {
      // Create todo with tags
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Remove Tags Test',
          tags: ['remove', 'these'],
        },
      });

      const createData = JSON.parse(createResponse.body);
      const todoId = createData.data.todo.id;

      // Remove all tags
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/v1/todos/${todoId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          tags: [],
        },
      });

      const updateData = JSON.parse(updateResponse.body);
      expect(updateData.data.todo.tags).toEqual([]);
    });

    it('should handle duplicate tags in input', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Duplicate Tags',
          tags: ['duplicate', 'duplicate', 'unique', 'duplicate'],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      // Should deduplicate
      expect(data.data.todo.tags).toEqual(['duplicate', 'unique']);
    });

    it('should normalize tag case', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Mixed Case Tags',
          tags: ['UPPER', 'lower', 'MiXeD'],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      // Should normalize to lowercase
      expect(data.data.todo.tags).toEqual(['upper', 'lower', 'mixed']);
    });

    it('should trim whitespace from tags', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Whitespace Tags',
          tags: ['  spaces  ', '\ttabs\t', 'normal'],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.todo.tags).toEqual(['spaces', 'tabs', 'normal']);
    });

    it('should filter out empty tags', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Empty Tags',
          tags: ['valid', '', '  ', '\t\n', 'another'],
        },
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.data.todo.tags).toEqual(['valid', 'another']);
    });
  });

  describe('Tag statistics and analytics', () => {
    beforeEach(async () => {
      // Create a rich dataset for analytics
      const now = new Date();
      const todos = [
        // Completed todos with tags
        { title: 'Completed 1', tags: ['work', 'done'], status: 'COMPLETED' },
        { title: 'Completed 2', tags: ['work', 'done', 'project'], status: 'COMPLETED' },
        { title: 'Completed 3', tags: ['personal', 'done'], status: 'COMPLETED' },
        
        // Pending todos with tags
        { title: 'Pending 1', tags: ['work', 'todo'], status: 'PENDING' },
        { title: 'Pending 2', tags: ['work', 'urgent'], status: 'PENDING' },
        { title: 'Pending 3', tags: ['personal', 'todo'], status: 'PENDING' },
        
        // In progress todos
        { title: 'In Progress 1', tags: ['work', 'active'], status: 'IN_PROGRESS' },
        { title: 'In Progress 2', tags: ['project', 'active'], status: 'IN_PROGRESS' },
        
        // Overdue todos
        { 
          title: 'Overdue 1', 
          tags: ['urgent', 'overdue'], 
          status: 'PENDING',
          dueDate: new Date(now.getTime() - 86400000).toISOString() // Yesterday
        },
        { 
          title: 'Overdue 2', 
          tags: ['work', 'overdue'], 
          status: 'PENDING',
          dueDate: new Date(now.getTime() - 172800000).toISOString() // 2 days ago
        },
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

    it('should get tag distribution across statuses', async () => {
      // Get all todos and analyze tag distribution
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.body);
      const todos = data.data.items;

      // Analyze work tag distribution
      const workTodos = todos.filter((t: any) => t.tags.includes('work'));
      const workByStatus = workTodos.reduce((acc: any, todo: any) => {
        acc[todo.status] = (acc[todo.status] || 0) + 1;
        return acc;
      }, {});

      expect(workByStatus.COMPLETED).toBe(2);
      expect(workByStatus.PENDING).toBe(3); // Including 1 overdue
      expect(workByStatus.IN_PROGRESS).toBe(1);
    });

    it('should identify most used tags in completed todos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?status=COMPLETED',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.body);
      const completedTodos = data.data.items;

      // Count tags in completed todos
      const tagCounts: Record<string, number> = {};
      completedTodos.forEach((todo: any) => {
        todo.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      expect(tagCounts.done).toBe(3);
      expect(tagCounts.work).toBe(2);
      expect(tagCounts.personal).toBe(1);
      expect(tagCounts.project).toBe(1);
    });

    it('should find tags associated with overdue todos', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?isOverdue=true',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.body);
      const overdueTodos = data.data.items;

      // All overdue todos should have the 'overdue' tag in our test data
      expect(overdueTodos).toHaveLength(2);
      expect(overdueTodos.every((t: any) => t.tags.includes('overdue'))).toBe(true);
      
      // Collect all tags from overdue todos
      const overdueTags = new Set<string>();
      overdueTodos.forEach((todo: any) => {
        todo.tags.forEach((tag: string) => overdueTags.add(tag));
      });

      expect(overdueTags.has('urgent')).toBe(true);
      expect(overdueTags.has('work')).toBe(true);
    });
  });
});