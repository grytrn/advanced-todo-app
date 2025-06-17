import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../backend/src/app';
import { chromium, Browser, Page } from '@playwright/test';

describe('Cross-Service Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let browser: Browser;
  let page: Page;
  
  const API_URL = process.env.API_URL || 'http://localhost:8000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const testUser = {
    email: `cross-service-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Cross Service User',
  };
  
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Start backend
    app = await buildApp();
    await app.listen({ port: 8000 });
    
    prisma = new PrismaClient();
    
    // Start browser
    browser = await chromium.launch();
    
    // Register test user via API
    const registerResponse = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    
    const registerData = await registerResponse.json();
    authToken = registerData.data.accessToken;
    userId = registerData.data.user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.todo.deleteMany({ where: { userId } });
    await prisma.category.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
    
    // Close browser and app
    await browser.close();
    await app.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // Navigate to login page
      await page.goto(`${FRONTEND_URL}/login`);
      
      // Fill login form
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Verify user is logged in
      const userName = await page.textContent('[data-testid="user-name"]');
      expect(userName).toBe(testUser.name);
      
      // Verify auth token is stored
      const localStorage = await page.evaluate(() => window.localStorage);
      expect(localStorage).toHaveProperty('authToken');
    });

    it('should persist authentication across page refreshes', async () => {
      // Login first
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Refresh page
      await page.reload();
      
      // Should still be logged in
      await page.waitForSelector('[data-testid="user-name"]');
      const userName = await page.textContent('[data-testid="user-name"]');
      expect(userName).toBe(testUser.name);
    });

    it('should handle token refresh automatically', async () => {
      // Login
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Wait for token to expire (simulate by modifying localStorage)
      await page.evaluate(() => {
        const auth = JSON.parse(localStorage.getItem('auth') || '{}');
        auth.expiresAt = Date.now() - 1000; // Expired
        localStorage.setItem('auth', JSON.stringify(auth));
      });
      
      // Make an API request (should trigger refresh)
      await page.click('[data-testid="create-todo-button"]');
      
      // Should still work without re-login
      await page.waitForSelector('[data-testid="todo-form"]');
    });
  });

  describe('TODO CRUD Operations', () => {
    beforeEach(async () => {
      // Login before each test
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
    });

    it('should create todo via UI and verify via API', async () => {
      // Navigate to todos page
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Click create button
      await page.click('[data-testid="create-todo-button"]');
      
      // Fill todo form
      await page.fill('input[name="title"]', 'Cross-service Test TODO');
      await page.fill('textarea[name="description"]', 'Created via UI, verified via API');
      await page.selectOption('select[name="priority"]', 'HIGH');
      await page.fill('input[name="tags"]', 'ui-test, integration');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for todo to appear in list
      await page.waitForSelector('text=Cross-service Test TODO');
      
      // Verify via API
      const apiResponse = await fetch(`${API_URL}/api/v1/todos`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      const apiData = await apiResponse.json();
      const createdTodo = apiData.data.items.find((t: any) => 
        t.title === 'Cross-service Test TODO'
      );
      
      expect(createdTodo).toBeDefined();
      expect(createdTodo.description).toBe('Created via UI, verified via API');
      expect(createdTodo.priority).toBe('HIGH');
      expect(createdTodo.tags).toContain('ui-test');
      expect(createdTodo.tags).toContain('integration');
    });

    it('should update todo via API and reflect in UI', async () => {
      // Create todo via API
      const createResponse = await fetch(`${API_URL}/api/v1/todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'API Created TODO',
          priority: 'LOW',
        }),
      });
      
      const createData = await createResponse.json();
      const todoId = createData.data.todo.id;
      
      // Navigate to todos page
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Verify todo appears
      await page.waitForSelector('text=API Created TODO');
      
      // Update via API
      await fetch(`${API_URL}/api/v1/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'API Updated TODO',
          priority: 'URGENT',
        }),
      });
      
      // Refresh page
      await page.reload();
      
      // Verify update in UI
      await page.waitForSelector('text=API Updated TODO');
      const priorityBadge = await page.locator(`[data-todo-id="${todoId}"] [data-testid="priority-badge"]`).textContent();
      expect(priorityBadge).toBe('URGENT');
    });

    it('should delete todo via UI and verify via API', async () => {
      // Create todo first
      const createResponse = await fetch(`${API_URL}/api/v1/todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'To Be Deleted',
        }),
      });
      
      const createData = await createResponse.json();
      const todoId = createData.data.todo.id;
      
      // Navigate to todos page
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Wait for todo to appear
      await page.waitForSelector('text=To Be Deleted');
      
      // Click delete button
      await page.click(`[data-todo-id="${todoId}"] [data-testid="delete-button"]`);
      
      // Confirm deletion
      await page.click('button:has-text("Confirm")');
      
      // Wait for todo to disappear
      await page.waitForSelector('text=To Be Deleted', { state: 'hidden' });
      
      // Verify via API
      const apiResponse = await fetch(`${API_URL}/api/v1/todos/${todoId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      expect(apiResponse.status).toBe(404);
    });
  });

  describe('Real-time Synchronization', () => {
    let secondPage: Page;

    beforeEach(async () => {
      // Login on first page
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Open second page and login
      secondPage = await browser.newPage();
      await secondPage.goto(`${FRONTEND_URL}/login`);
      await secondPage.fill('input[name="email"]', testUser.email);
      await secondPage.fill('input[name="password"]', testUser.password);
      await secondPage.click('button[type="submit"]');
      await secondPage.waitForURL(`${FRONTEND_URL}/dashboard`);
    });

    afterEach(async () => {
      await secondPage.close();
    });

    it('should sync todo creation across multiple sessions', async () => {
      // Navigate both pages to todos
      await page.goto(`${FRONTEND_URL}/todos`);
      await secondPage.goto(`${FRONTEND_URL}/todos`);
      
      // Create todo on first page
      await page.click('[data-testid="create-todo-button"]');
      await page.fill('input[name="title"]', 'Real-time Test TODO');
      await page.click('button[type="submit"]');
      
      // Should appear on second page without refresh
      await secondPage.waitForSelector('text=Real-time Test TODO', { timeout: 5000 });
    });

    it('should sync todo updates across sessions', async () => {
      // Create todo via API
      const createResponse = await fetch(`${API_URL}/api/v1/todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Original Title',
          status: 'PENDING',
        }),
      });
      
      const createData = await createResponse.json();
      const todoId = createData.data.todo.id;
      
      // Navigate both pages to todos
      await page.goto(`${FRONTEND_URL}/todos`);
      await secondPage.goto(`${FRONTEND_URL}/todos`);
      
      // Wait for todo to appear on both pages
      await page.waitForSelector('text=Original Title');
      await secondPage.waitForSelector('text=Original Title');
      
      // Complete todo on first page
      await page.click(`[data-todo-id="${todoId}"] [data-testid="complete-checkbox"]`);
      
      // Should update on second page
      await secondPage.waitForSelector(`[data-todo-id="${todoId}"][data-completed="true"]`, { timeout: 5000 });
    });

    it('should sync todo deletion across sessions', async () => {
      // Create todo via API
      const createResponse = await fetch(`${API_URL}/api/v1/todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'To Be Deleted in Real-time',
        }),
      });
      
      const createData = await createResponse.json();
      const todoId = createData.data.todo.id;
      
      // Navigate both pages to todos
      await page.goto(`${FRONTEND_URL}/todos`);
      await secondPage.goto(`${FRONTEND_URL}/todos`);
      
      // Wait for todo to appear on both pages
      await page.waitForSelector('text=To Be Deleted in Real-time');
      await secondPage.waitForSelector('text=To Be Deleted in Real-time');
      
      // Delete on first page
      await page.click(`[data-todo-id="${todoId}"] [data-testid="delete-button"]`);
      await page.click('button:has-text("Confirm")');
      
      // Should disappear from second page
      await secondPage.waitForSelector('text=To Be Deleted in Real-time', { state: 'hidden', timeout: 5000 });
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(async () => {
      // Login
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Create test data via API
      const todos = [
        { title: 'High Priority Task', priority: 'HIGH', status: 'PENDING' },
        { title: 'Completed Task', priority: 'MEDIUM', status: 'COMPLETED' },
        { title: 'Urgent Work', priority: 'URGENT', status: 'IN_PROGRESS' },
        { title: 'Low Priority Item', priority: 'LOW', status: 'PENDING' },
      ];
      
      for (const todo of todos) {
        await fetch(`${API_URL}/api/v1/todos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todo),
        });
      }
    });

    it('should filter todos by status in UI', async () => {
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Wait for todos to load
      await page.waitForSelector('[data-testid="todo-item"]');
      
      // Filter by completed status
      await page.click('[data-testid="status-filter"]');
      await page.click('text=Completed');
      
      // Should only show completed todos
      const visibleTodos = await page.locator('[data-testid="todo-item"]').count();
      expect(visibleTodos).toBe(1);
      
      const todoTitle = await page.locator('[data-testid="todo-item"] [data-testid="todo-title"]').textContent();
      expect(todoTitle).toBe('Completed Task');
    });

    it('should filter todos by priority', async () => {
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Filter by high/urgent priority
      await page.click('[data-testid="priority-filter"]');
      await page.click('text=High & Urgent');
      
      // Count filtered todos
      const visibleTodos = await page.locator('[data-testid="todo-item"]').count();
      expect(visibleTodos).toBe(2);
      
      // Verify priorities
      const priorities = await page.locator('[data-testid="priority-badge"]').allTextContents();
      expect(priorities).toContain('HIGH');
      expect(priorities).toContain('URGENT');
    });

    it('should search todos by text', async () => {
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Search for "work"
      await page.fill('[data-testid="search-input"]', 'work');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Should find "Urgent Work"
      const visibleTodos = await page.locator('[data-testid="todo-item"]').count();
      expect(visibleTodos).toBe(1);
      
      const todoTitle = await page.locator('[data-testid="todo-item"] [data-testid="todo-title"]').textContent();
      expect(todoTitle).toBe('Urgent Work');
    });

    it('should combine multiple filters', async () => {
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Filter by pending status and search for "priority"
      await page.click('[data-testid="status-filter"]');
      await page.click('text=Pending');
      
      await page.fill('[data-testid="search-input"]', 'priority');
      await page.press('[data-testid="search-input"]', 'Enter');
      
      // Should find pending todos with "priority" in title
      const visibleTodos = await page.locator('[data-testid="todo-item"]').count();
      expect(visibleTodos).toBe(2); // "High Priority Task" and "Low Priority Item"
    });
  });

  describe('Export Functionality', () => {
    beforeEach(async () => {
      // Login
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Create test todos
      const todos = [
        { title: 'Export Test 1', priority: 'HIGH' },
        { title: 'Export Test 2', priority: 'MEDIUM' },
        { title: 'Export Test 3', priority: 'LOW' },
      ];
      
      for (const todo of todos) {
        await fetch(`${API_URL}/api/v1/todos`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(todo),
        });
      }
    });

    it('should export todos to CSV from UI', async () => {
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download');
      
      // Click export button and select CSV
      await page.click('[data-testid="export-button"]');
      await page.click('text=Export as CSV');
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/todos-export-.*\.csv/);
      
      // Save and verify content
      const path = await download.path();
      const content = await download.failure();
      expect(content).toBeNull(); // No failure
    });

    it('should export filtered todos', async () => {
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Filter by HIGH priority
      await page.click('[data-testid="priority-filter"]');
      await page.click('text=High');
      
      // Export filtered results
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="export-button"]');
      await page.click('text=Export as JSON');
      
      const download = await downloadPromise;
      const path = await download.path();
      
      // Read and verify JSON content
      if (path) {
        const content = await download.createReadStream();
        let data = '';
        for await (const chunk of content) {
          data += chunk;
        }
        
        const json = JSON.parse(data);
        expect(json.todos).toHaveLength(1);
        expect(json.todos[0].title).toBe('Export Test 1');
        expect(json.todos[0].priority).toBe('HIGH');
      }
    });
  });

  describe('Performance and Load', () => {
    it('should handle pagination efficiently', async () => {
      // Create many todos via API
      const todoPromises = [];
      for (let i = 0; i < 100; i++) {
        todoPromises.push(
          fetch(`${API_URL}/api/v1/todos`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `Pagination Test ${i}`,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
            }),
          })
        );
      }
      await Promise.all(todoPromises);
      
      // Login and navigate to todos
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Measure initial load time
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="todo-item"]');
      const loadTime = Date.now() - startTime;
      
      // Should load quickly
      expect(loadTime).toBeLessThan(2000);
      
      // Verify pagination controls
      const paginationInfo = await page.textContent('[data-testid="pagination-info"]');
      expect(paginationInfo).toContain('100'); // Total count
      
      // Navigate to next page
      await page.click('[data-testid="next-page"]');
      
      // Should load different todos
      await page.waitForSelector('[data-testid="todo-item"]');
      const firstTodoOnPage2 = await page.locator('[data-testid="todo-item"]:first-child [data-testid="todo-title"]').textContent();
      expect(firstTodoOnPage2).not.toBe('Pagination Test 0');
    });

    it('should handle concurrent updates gracefully', async () => {
      // Login
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(`${FRONTEND_URL}/dashboard`);
      
      // Create a todo
      const createResponse = await fetch(`${API_URL}/api/v1/todos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Concurrent Update Test',
        }),
      });
      
      const createData = await createResponse.json();
      const todoId = createData.data.todo.id;
      
      // Navigate to todos
      await page.goto(`${FRONTEND_URL}/todos`);
      
      // Start editing in UI
      await page.click(`[data-todo-id="${todoId}"] [data-testid="edit-button"]`);
      
      // Simultaneously update via API
      await fetch(`${API_URL}/api/v1/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'API Updated Title',
        }),
      });
      
      // Complete UI edit
      await page.fill('input[name="title"]', 'UI Updated Title');
      await page.click('button[type="submit"]');
      
      // Should handle conflict gracefully
      await page.waitForSelector('[data-testid="conflict-dialog"], [data-testid="todo-item"]');
      
      // If conflict dialog appears, resolve it
      if (await page.isVisible('[data-testid="conflict-dialog"]')) {
        await page.click('button:has-text("Keep Mine")');
      }
      
      // Verify final state
      const finalTitle = await page.locator(`[data-todo-id="${todoId}"] [data-testid="todo-title"]`).textContent();
      expect(['API Updated Title', 'UI Updated Title']).toContain(finalTitle);
    });
  });
});