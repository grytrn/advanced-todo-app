import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import PDFParser from 'pdf-parse';

describe('Export Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let categoryId: string;

  const testUser = {
    email: `export-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Export Test User',
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
    // Create test category
    const categoryResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/categories',
      headers: {
        authorization: `Bearer ${authToken}`,
      },
      payload: {
        name: 'Export Test Category',
        color: '#FF5733',
        icon: '📁',
      },
    });
    
    const categoryData = JSON.parse(categoryResponse.body);
    categoryId = categoryData.data.category.id;

    // Create test todos
    const todos = [
      {
        title: 'Completed Task 1',
        description: 'This is a completed task with description',
        status: 'COMPLETED',
        priority: 'HIGH',
        categoryId,
        tags: ['export', 'completed'],
        completedAt: new Date().toISOString(),
      },
      {
        title: 'Pending Task 1',
        description: 'This is a pending task',
        status: 'PENDING',
        priority: 'MEDIUM',
        categoryId,
        tags: ['export', 'pending'],
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        title: 'In Progress Task',
        description: 'Currently working on this',
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        tags: ['export', 'active'],
      },
      {
        title: 'Overdue Task',
        description: 'This task is overdue',
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: new Date(Date.now() - 86400000).toISOString(),
        tags: ['export', 'overdue'],
      },
      {
        title: 'Task with Special Characters',
        description: 'Contains "quotes", commas, and\nnewlines',
        status: 'PENDING',
        priority: 'LOW',
        tags: ['special-chars', 'test'],
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

  afterEach(async () => {
    // Clean up todos after each test
    await prisma.todo.deleteMany({ where: { userId } });
  });

  describe('CSV Export', () => {
    it('should export all todos to CSV', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="todos-export-.*\.csv"/);

      // Parse CSV content
      const csvContent = response.body;
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      });

      expect(records).toHaveLength(5);
      
      // Verify CSV structure
      const firstRecord = records[0];
      expect(firstRecord).toHaveProperty('Title');
      expect(firstRecord).toHaveProperty('Description');
      expect(firstRecord).toHaveProperty('Status');
      expect(firstRecord).toHaveProperty('Priority');
      expect(firstRecord).toHaveProperty('Category');
      expect(firstRecord).toHaveProperty('Tags');
      expect(firstRecord).toHaveProperty('Due Date');
      expect(firstRecord).toHaveProperty('Created At');

      // Verify specific todo
      const completedTask = records.find((r: any) => r.Title === 'Completed Task 1');
      expect(completedTask.Status).toBe('COMPLETED');
      expect(completedTask.Priority).toBe('HIGH');
      expect(completedTask.Category).toBe('Export Test Category');
      expect(completedTask.Tags).toBe('export, completed');
    });

    it('should filter CSV export by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv?status=COMPLETED',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const records = parse(response.body, {
        columns: true,
        skip_empty_lines: true,
      });

      expect(records).toHaveLength(1);
      expect(records[0].Title).toBe('Completed Task 1');
      expect(records[0].Status).toBe('COMPLETED');
    });

    it('should filter CSV export by category', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/todos/export/csv?categoryId=${categoryId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const records = parse(response.body, {
        columns: true,
        skip_empty_lines: true,
      });

      expect(records).toHaveLength(2);
      records.forEach((record: any) => {
        expect(record.Category).toBe('Export Test Category');
      });
    });

    it('should filter CSV export by tag', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv?tag=overdue',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const records = parse(response.body, {
        columns: true,
        skip_empty_lines: true,
      });

      expect(records).toHaveLength(1);
      expect(records[0].Title).toBe('Overdue Task');
      expect(records[0].Tags).toContain('overdue');
    });

    it('should handle special characters in CSV export', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const records = parse(response.body, {
        columns: true,
        skip_empty_lines: true,
      });

      const specialTask = records.find((r: any) => r.Title === 'Task with Special Characters');
      expect(specialTask).toBeDefined();
      expect(specialTask.Description).toBe('Contains "quotes", commas, and\nnewlines');
    });

    it('should return empty CSV with headers when no todos', async () => {
      // Clear todos
      await prisma.todo.deleteMany({ where: { userId } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const csvContent = response.body;
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      // Should have header row only
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain('Title');
      expect(lines[0]).toContain('Status');
    });
  });

  describe('PDF Export', () => {
    it('should export all todos to PDF', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/pdf',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="todos-export-.*\.pdf"/);

      // Verify it's a valid PDF
      const pdfBuffer = Buffer.from(response.rawPayload);
      expect(pdfBuffer.toString('utf8', 0, 4)).toBe('%PDF');

      // Parse PDF content
      const pdfData = await PDFParser(pdfBuffer);
      const text = pdfData.text;

      // Verify content
      expect(text).toContain('TODO Export');
      expect(text).toContain('Completed Task 1');
      expect(text).toContain('Pending Task 1');
      expect(text).toContain('In Progress Task');
      expect(text).toContain('Export Test Category');
    });

    it('should filter PDF export by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/pdf?status=PENDING',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const pdfBuffer = Buffer.from(response.rawPayload);
      const pdfData = await PDFParser(pdfBuffer);
      const text = pdfData.text;

      expect(text).toContain('Pending Task 1');
      expect(text).toContain('Overdue Task');
      expect(text).not.toContain('Completed Task 1');
      expect(text).not.toContain('In Progress Task');
    });

    it('should include statistics in PDF export', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/pdf',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const pdfBuffer = Buffer.from(response.rawPayload);
      const pdfData = await PDFParser(pdfBuffer);
      const text = pdfData.text;

      // Should include summary statistics
      expect(text).toMatch(/Total TODOs:\s*5/);
      expect(text).toMatch(/Completed:\s*1/);
      expect(text).toMatch(/Pending:\s*3/);
      expect(text).toMatch(/In Progress:\s*1/);
    });

    it('should group by category in PDF export', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/pdf?groupBy=category',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const pdfBuffer = Buffer.from(response.rawPayload);
      const pdfData = await PDFParser(pdfBuffer);
      const text = pdfData.text;

      // Should have category sections
      expect(text).toContain('Export Test Category');
      expect(text).toContain('Uncategorized');
    });

    it('should handle empty todos in PDF export', async () => {
      // Clear todos
      await prisma.todo.deleteMany({ where: { userId } });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/pdf',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const pdfBuffer = Buffer.from(response.rawPayload);
      const pdfData = await PDFParser(pdfBuffer);
      const text = pdfData.text;

      expect(text).toContain('TODO Export');
      expect(text).toContain('No todos found');
    });
  });

  describe('JSON Export', () => {
    it('should export todos to JSON', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/json',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('application/json');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="todos-export-.*\.json"/);

      const data = JSON.parse(response.body);
      
      expect(data).toHaveProperty('exportDate');
      expect(data).toHaveProperty('user');
      expect(data).toHaveProperty('filters');
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('todos');
      expect(data).toHaveProperty('categories');

      expect(data.todos).toHaveLength(5);
      expect(data.statistics).toMatchObject({
        total: 5,
        completed: 1,
        pending: 3,
        inProgress: 1,
      });

      // Verify todo structure
      const todo = data.todos[0];
      expect(todo).toHaveProperty('id');
      expect(todo).toHaveProperty('title');
      expect(todo).toHaveProperty('description');
      expect(todo).toHaveProperty('status');
      expect(todo).toHaveProperty('priority');
      expect(todo).toHaveProperty('tags');
      expect(todo).toHaveProperty('createdAt');
      expect(todo).toHaveProperty('updatedAt');
    });

    it('should include related data in JSON export', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/json?includeRelated=true',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const data = JSON.parse(response.body);
      
      // Should include categories with usage count
      expect(data.categories).toHaveLength(1);
      expect(data.categories[0]).toMatchObject({
        name: 'Export Test Category',
        color: '#FF5733',
        icon: '📁',
        todoCount: 2,
      });

      // Should include tag statistics
      expect(data.tagStatistics).toBeDefined();
      expect(data.tagStatistics).toContainEqual({ tag: 'export', count: 4 });
    });
  });

  describe('Markdown Export', () => {
    it('should export todos to Markdown', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/markdown',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/markdown');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename="todos-export-.*\.md"/);

      const markdown = response.body;

      // Verify markdown structure
      expect(markdown).toContain('# TODO Export');
      expect(markdown).toContain('## Summary');
      expect(markdown).toContain('## TODOs');
      
      // Check for todos
      expect(markdown).toContain('### Completed Task 1');
      expect(markdown).toContain('**Status:** COMPLETED');
      expect(markdown).toContain('**Priority:** HIGH');
      expect(markdown).toContain('**Category:** Export Test Category');
      expect(markdown).toContain('**Tags:** export, completed');
      
      // Check for proper markdown formatting
      expect(markdown).toMatch(/- \*\*Total TODOs:\*\* 5/);
      expect(markdown).toMatch(/- \[x\] Completed Task 1/); // Completed checkbox
      expect(markdown).toMatch(/- \[ \] Pending Task 1/); // Uncompleted checkbox
    });

    it('should group by priority in Markdown export', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/markdown?groupBy=priority',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const markdown = response.body;

      // Should have priority sections
      expect(markdown).toContain('## URGENT Priority');
      expect(markdown).toContain('## HIGH Priority');
      expect(markdown).toContain('## MEDIUM Priority');
      expect(markdown).toContain('## LOW Priority');
    });
  });

  describe('Export Performance', () => {
    beforeEach(async () => {
      // Create many todos for performance testing
      const todoPromises = [];
      for (let i = 0; i < 1000; i++) {
        todoPromises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Performance Test Todo ${i}`,
              description: `Description for todo ${i}`,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
              status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][i % 3],
              tags: [`tag${i % 10}`, `category${i % 5}`],
            },
          })
        );
      }
      await Promise.all(todoPromises);
    });

    it('should export large CSV efficiently', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds

      const records = parse(response.body, {
        columns: true,
        skip_empty_lines: true,
      });

      expect(records.length).toBeGreaterThan(1000);
    });

    it('should stream large exports', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv?stream=true',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['transfer-encoding']).toBe('chunked');
    });
  });

  describe('Export Security', () => {
    it('should require authentication for exports', async () => {
      const formats = ['csv', 'pdf', 'json', 'markdown'];
      
      for (const format of formats) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/todos/export/${format}`,
        });

        expect(response.statusCode).toBe(401);
        const data = JSON.parse(response.body);
        expect(data.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('should only export user\'s own todos', async () => {
      // Create another user
      const otherUser = {
        email: `other-export-${Date.now()}@example.com`,
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
      
      // Create todo for other user
      await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${otherUserToken}`,
        },
        payload: {
          title: 'Other User Private Todo',
          tags: ['private', 'other-user'],
        },
      });
      
      // Export as first user
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos/export/csv',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      
      const records = parse(response.body, {
        columns: true,
        skip_empty_lines: true,
      });

      // Should not contain other user's todo
      expect(records.every((r: any) => r.Title !== 'Other User Private Todo')).toBe(true);
      
      // Clean up other user
      await prisma.todo.deleteMany({ where: { userId: otherUserData.data.user.id } });
      await prisma.user.delete({ where: { id: otherUserData.data.user.id } });
    });
  });
});