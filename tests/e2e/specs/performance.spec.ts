import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { TodoHelper } from '../helpers/todo.helper';
import { testUsers } from '../../fixtures/users';

test.describe('Frontend Performance', () => {
  let authHelper: AuthHelper;
  let todoHelper: TodoHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    todoHelper = new TodoHelper(page);

    // Register and login
    const uniqueUser = {
      ...testUsers.alice,
      email: `perf${Date.now()}@example.com`,
    };
    await authHelper.register(uniqueUser);
    await authHelper.login(uniqueUser);
  });

  test('should load dashboard quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        let fcp, lcp, cls = 0;
        
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
          fcp = list.getEntries()[0].startTime;
        });
        fcpObserver.observe({ entryTypes: ['paint'] });
        
        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1].startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Cumulative Layout Shift
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            cls += entry.value;
          }
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        // Wait for metrics to be collected
        setTimeout(() => {
          resolve({ fcp, lcp, cls });
        }, 2000);
      });
    });
    
    console.log('Performance metrics:', metrics);
    
    // Core Web Vitals thresholds
    expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s is good
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s is good
    expect(metrics.cls).toBeLessThan(0.1);  // CLS < 0.1 is good
  });

  test('should handle large todo lists efficiently', async ({ page }) => {
    // Create many todos
    for (let i = 0; i < 50; i++) {
      await todoHelper.createTodo({
        title: `Performance test todo ${i}`,
        description: `Description for todo ${i}`,
        priority: ['low', 'medium', 'high'][i % 3] as any,
      });
    }
    
    // Measure render performance
    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="todo-item"]');
    const renderTime = Date.now() - startTime;
    
    // Should render within 3 seconds
    expect(renderTime).toBeLessThan(3000);
    
    // Check if virtual scrolling is working (if implemented)
    const visibleTodos = await page.locator('[data-testid="todo-item"]').count();
    console.log(`Visible todos: ${visibleTodos}`);
    
    // Scroll performance
    const scrollStartTime = Date.now();
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(100);
    const scrollTime = Date.now() - scrollStartTime;
    
    // Scrolling should be smooth
    expect(scrollTime).toBeLessThan(500);
  });

  test('should search todos quickly', async ({ page }) => {
    // Create searchable todos
    const todoTitles = [
      'Buy groceries',
      'Complete project report',
      'Schedule dentist appointment',
      'Review pull requests',
      'Plan weekend trip',
    ];
    
    for (const title of todoTitles) {
      await todoHelper.createTodo({ title });
    }
    
    // Measure search performance
    const searchInput = page.locator('[data-testid="search-input"]');
    
    const searchStartTime = Date.now();
    await searchInput.fill('project');
    await page.waitForTimeout(300); // Debounce delay
    await page.waitForLoadState('networkidle');
    const searchTime = Date.now() - searchStartTime;
    
    // Search should be responsive
    expect(searchTime).toBeLessThan(1000);
    
    // Verify search results
    await todoHelper.expectTodoVisible('Complete project report');
    await todoHelper.expectTodoNotVisible('Buy groceries');
  });

  test('should handle rapid todo creation', async ({ page }) => {
    const createTimes = [];
    
    // Create 10 todos rapidly
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      
      await todoHelper.createTodo({
        title: `Rapid todo ${i}`,
        priority: 'high',
      });
      
      const createTime = Date.now() - startTime;
      createTimes.push(createTime);
    }
    
    // Average creation time
    const avgTime = createTimes.reduce((a, b) => a + b) / createTimes.length;
    console.log(`Average todo creation time: ${avgTime}ms`);
    
    // Each creation should be fast
    expect(Math.max(...createTimes)).toBeLessThan(2000);
    expect(avgTime).toBeLessThan(1000);
  });

  test('should handle drag and drop smoothly', async ({ page }) => {
    // Create todos for drag and drop
    const todos = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
    for (const title of todos) {
      await todoHelper.createTodo({ title });
    }
    
    // Measure drag and drop performance
    const startTime = Date.now();
    
    await todoHelper.dragAndDropTodo('First', 'bottom');
    
    const dragTime = Date.now() - startTime;
    
    // Drag operation should be smooth
    expect(dragTime).toBeLessThan(1000);
    
    // Verify reorder happened
    const lastTodo = page.locator('[data-testid="todo-item"]').last();
    await expect(lastTodo).toContainText('First');
  });

  test('should load images efficiently', async ({ page }) => {
    // If the app has images (avatars, etc.)
    await page.goto('/dashboard');
    
    // Check for lazy loading
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const loading = await img.getAttribute('loading');
      // Images should use lazy loading
      expect(loading).toBe('lazy');
    }
    
    // Check image optimization
    const imageSizes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayWidth: img.offsetWidth,
        displayHeight: img.offsetHeight,
      }));
    });
    
    // Images shouldn't be oversized for their display size
    for (const img of imageSizes) {
      if (img.displayWidth > 0) {
        const ratio = img.naturalWidth / img.displayWidth;
        // Natural size shouldn't be more than 2x display size
        expect(ratio).toBeLessThan(2.5);
      }
    }
  });

  test('should handle theme switching smoothly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    
    // Measure theme switch performance
    const startTime = Date.now();
    
    await themeToggle.click();
    
    // Wait for theme to apply
    await page.waitForTimeout(100);
    
    const switchTime = Date.now() - startTime;
    
    // Theme switch should be instant
    expect(switchTime).toBeLessThan(200);
    
    // Check for FOUC (Flash of Unstyled Content)
    const backgroundColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    
    // Should have applied dark theme
    expect(backgroundColor).not.toBe('rgb(255, 255, 255)');
  });

  test('should export data efficiently', async ({ page }) => {
    // Create some todos to export
    for (let i = 0; i < 20; i++) {
      await todoHelper.createTodo({
        title: `Export test todo ${i}`,
        description: `Description ${i}`,
      });
    }
    
    // Measure export performance
    const downloadPromise = page.waitForEvent('download');
    
    const startTime = Date.now();
    
    await page.click('[data-testid="export-button"]');
    await page.click('[data-testid="export-json"]');
    
    const download = await downloadPromise;
    const exportTime = Date.now() - startTime;
    
    // Export should be fast
    expect(exportTime).toBeLessThan(2000);
    
    // Verify download
    expect(download.suggestedFilename()).toContain('todos');
    expect(download.suggestedFilename()).toContain('.json');
  });

  test('should measure memory usage', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });
    
    // Create many todos
    for (let i = 0; i < 100; i++) {
      await todoHelper.createTodo({
        title: `Memory test todo ${i}`,
        description: 'x'.repeat(100), // 100 char description
      });
    }
    
    // Get memory after creating todos
    const afterCreateMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    });
    
    if (initialMemory && afterCreateMemory) {
      const memoryIncrease = afterCreateMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      // Memory increase should be reasonable
      expect(memoryIncreaseMB).toBeLessThan(50); // Less than 50MB increase
    }
  });
});