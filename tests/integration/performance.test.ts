import { describe, it, expect, beforeAll } from 'vitest';
import { TestApiClient } from '../utils/api-client';
import { measurePerformance, generateLargeTodoList } from '../utils/test-helpers';
import { testUsers } from '../fixtures/users';

describe('Performance Tests', () => {
  let client: TestApiClient;
  let userId: string;

  beforeAll(async () => {
    client = new TestApiClient();
    
    // Register and login a test user
    const uniqueUser = {
      ...testUsers.alice,
      email: `perf-test${Date.now()}@example.com`,
    };
    
    const response = await client.register(uniqueUser);
    userId = response.data.user.id;
  });

  describe('API Response Times', () => {
    it('should handle single todo creation within 200ms', async () => {
      const { duration } = await measurePerformance('single-todo-create', async () => {
        await client.createTodo({
          title: 'Performance test todo',
          priority: 'high',
          status: 'pending',
        });
      });

      expect(duration).toBeLessThan(200);
    });

    it('should fetch user todos within 100ms', async () => {
      // Create some todos first
      const todos = generateLargeTodoList(20);
      for (const todo of todos) {
        await client.createTodo(todo);
      }

      const { duration } = await measurePerformance('fetch-todos', async () => {
        await client.getTodos();
      });

      expect(duration).toBeLessThan(100);
    });

    it('should handle pagination efficiently', async () => {
      // Create many todos
      const todos = generateLargeTodoList(100);
      for (const todo of todos) {
        await client.createTodo(todo);
      }

      const { duration } = await measurePerformance('paginated-fetch', async () => {
        await client.getTodos({ page: 1, limit: 20 });
      });

      expect(duration).toBeLessThan(150);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle 50 concurrent todo creations', async () => {
      const todos = generateLargeTodoList(50);
      
      const { duration } = await measurePerformance('concurrent-create-50', async () => {
        await Promise.all(
          todos.map(todo => client.createTodo(todo))
        );
      });

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
      
      // Verify all todos were created
      const response = await client.getTodos({ limit: 100 });
      expect(response.data.items.length).toBeGreaterThanOrEqual(50);
    });

    it('should handle 100 concurrent read operations', async () => {
      // Create a todo to read
      const todo = await client.createTodo({
        title: 'Todo to read concurrently',
        priority: 'medium',
        status: 'pending',
      });

      const { duration } = await measurePerformance('concurrent-read-100', async () => {
        await Promise.all(
          Array(100).fill(null).map(() => client.getTodo(todo.data.id))
        );
      });

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });

    it('should handle mixed read/write operations', async () => {
      const operations = [];
      
      // 30 creates
      for (let i = 0; i < 30; i++) {
        operations.push(
          client.createTodo({
            title: `Mixed op todo ${i}`,
            priority: 'low',
            status: 'pending',
          })
        );
      }
      
      // 70 reads
      for (let i = 0; i < 70; i++) {
        operations.push(client.getTodos({ page: 1, limit: 10 }));
      }

      const { duration } = await measurePerformance('mixed-operations-100', async () => {
        await Promise.all(operations);
      });

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Search Performance', () => {
    beforeAll(async () => {
      // Create a large dataset for search testing
      const todos = generateLargeTodoList(200);
      for (const todo of todos) {
        await client.createTodo(todo);
      }
    });

    it('should search todos efficiently', async () => {
      const { duration } = await measurePerformance('search-todos', async () => {
        await client.getTodos({ search: 'Todo 5' });
      });

      // Search should be fast even with many records
      expect(duration).toBeLessThan(200);
    });

    it('should filter by multiple criteria efficiently', async () => {
      const { duration } = await measurePerformance('complex-filter', async () => {
        await client.getTodos({
          priority: 'high',
          status: 'pending',
          tags: ['work'],
          sort: 'dueDate',
        });
      });

      expect(duration).toBeLessThan(250);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk updates efficiently', async () => {
      // Create todos to update
      const todos = [];
      for (let i = 0; i < 50; i++) {
        const todo = await client.createTodo({
          title: `Bulk update todo ${i}`,
          priority: 'low',
          status: 'pending',
        });
        todos.push(todo.data);
      }

      const { duration } = await measurePerformance('bulk-update-50', async () => {
        await Promise.all(
          todos.map(todo => 
            client.updateTodo(todo.id, { status: 'completed' })
          )
        );
      });

      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle bulk deletes efficiently', async () => {
      // Create todos to delete
      const todoIds = [];
      for (let i = 0; i < 30; i++) {
        const todo = await client.createTodo({
          title: `Bulk delete todo ${i}`,
          priority: 'low',
          status: 'pending',
        });
        todoIds.push(todo.data.id);
      }

      const { duration } = await measurePerformance('bulk-delete-30', async () => {
        await Promise.all(
          todoIds.map(id => client.deleteTodo(id))
        );
      });

      // Should complete within 3 seconds
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Memory Usage', () => {
    it('should handle large payload responses', async () => {
      // Create many todos with large descriptions
      const largeTodos = Array(50).fill(null).map((_, i) => ({
        title: `Large todo ${i}`,
        description: 'x'.repeat(1000), // 1KB description
        priority: 'medium' as const,
        status: 'pending' as const,
        tags: Array(10).fill(null).map((_, j) => `tag${j}`),
      }));

      for (const todo of largeTodos) {
        await client.createTodo(todo);
      }

      const { duration, result } = await measurePerformance('large-payload-fetch', async () => {
        return await client.getTodos({ limit: 50 });
      });

      expect(duration).toBeLessThan(500);
      expect(result.data.items.length).toBe(50);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limit gracefully', async () => {
      const requests = 100;
      const results = [];

      const { duration } = await measurePerformance(`rate-limit-${requests}`, async () => {
        for (let i = 0; i < requests; i++) {
          try {
            const response = await client.getTodos();
            results.push({ success: true, status: 200 });
          } catch (error: any) {
            results.push({ 
              success: false, 
              status: error.response?.status || 0 
            });
          }
        }
      });

      // Count rate limited responses
      const rateLimited = results.filter(r => r.status === 429).length;
      const successful = results.filter(r => r.success).length;

      console.log(`Rate limit test: ${successful} successful, ${rateLimited} rate limited`);

      // Should have some successful requests
      expect(successful).toBeGreaterThan(0);
      
      // Duration should be reasonable even with rate limiting
      expect(duration).toBeLessThan(10000);
    });
  });
});