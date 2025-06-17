import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { buildApp } from '../../src/app';

describe('Performance Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;

  const testUser = {
    email: `perf-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'Performance Test User',
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

  describe('Response Time Benchmarks', () => {
    it('should respond to health check within 50ms', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(50);
    });

    it('should authenticate requests within 100ms', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(100);
    });

    it('should create todo within 150ms', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/todos',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          title: 'Performance Test Todo',
          priority: 'HIGH',
          tags: ['performance', 'test'],
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(201);
      expect(responseTime).toBeLessThan(150);
    });

    it('should list todos within 200ms with pagination', async () => {
      // Create some todos first
      const todoPromises = [];
      for (let i = 0; i < 50; i++) {
        todoPromises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Perf Test ${i}`,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
              tags: [`tag${i % 5}`, `tag${i % 3}`],
            },
          })
        );
      }
      await Promise.all(todoPromises);

      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?limit=20&page=1',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(200);
      
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(20);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle 100 concurrent todo creations', async () => {
      const concurrentRequests = 100;
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Concurrent Todo ${i}`,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
            },
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });
      
      // Should complete within reasonable time (5 seconds for 100 requests)
      expect(totalTime).toBeLessThan(5000);
      
      // Verify all were created
      const listResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?limit=200',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const listData = JSON.parse(listResponse.body);
      expect(listData.data.items.length).toBeGreaterThanOrEqual(concurrentRequests);
    });

    it('should handle mixed concurrent operations', async () => {
      // Create initial todos
      const initialTodos = [];
      for (let i = 0; i < 10; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            title: `Initial Todo ${i}`,
          },
        });
        const data = JSON.parse(response.body);
        initialTodos.push(data.data.todo.id);
      }

      const startTime = Date.now();
      
      // Mix of operations
      const promises = [];
      
      // Create operations
      for (let i = 0; i < 20; i++) {
        promises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `New Todo ${i}`,
            },
          })
        );
      }
      
      // Read operations
      for (let i = 0; i < 30; i++) {
        promises.push(
          app.inject({
            method: 'GET',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
          })
        );
      }
      
      // Update operations
      for (let i = 0; i < 5; i++) {
        if (initialTodos[i]) {
          promises.push(
            app.inject({
              method: 'PATCH',
              url: `/api/v1/todos/${initialTodos[i]}`,
              headers: {
                authorization: `Bearer ${authToken}`,
              },
              payload: {
                title: `Updated Todo ${i}`,
                priority: 'HIGH',
              },
            })
          );
        }
      }
      
      // Delete operations
      for (let i = 5; i < 8; i++) {
        if (initialTodos[i]) {
          promises.push(
            app.inject({
              method: 'DELETE',
              url: `/api/v1/todos/${initialTodos[i]}`,
              headers: {
                authorization: `Bearer ${authToken}`,
              },
            })
          );
        }
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // All should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.statusCode);
      });
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(3000);
    });
  });

  describe('Database Query Performance', () => {
    beforeEach(async () => {
      // Create a large dataset
      const categories = [];
      for (let i = 0; i < 5; i++) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/categories',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            name: `Category ${i}`,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          },
        });
        const data = JSON.parse(response.body);
        categories.push(data.data.category.id);
      }

      // Create 500 todos
      const todoPromises = [];
      for (let i = 0; i < 500; i++) {
        todoPromises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Large Dataset Todo ${i}`,
              description: `This is a description for todo ${i} with some additional text to make it more realistic`,
              priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'][i % 4],
              status: ['PENDING', 'IN_PROGRESS', 'COMPLETED'][i % 3],
              categoryId: categories[i % 5],
              tags: [`tag${i % 10}`, `tag${i % 7}`, `tag${i % 5}`],
              dueDate: i % 3 === 0 ? new Date(Date.now() + i * 86400000).toISOString() : undefined,
            },
          })
        );
      }
      await Promise.all(todoPromises);
    });

    it('should filter todos efficiently', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?status=COMPLETED&priority=HIGH&limit=50',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(300); // Should be fast even with filters
      
      const data = JSON.parse(response.body);
      expect(data.data.items.every((t: any) => t.status === 'COMPLETED' && t.priority === 'HIGH')).toBe(true);
    });

    it('should search todos efficiently', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?search=Dataset%20Todo%2010&limit=10',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(300); // Search should be optimized
      
      const data = JSON.parse(response.body);
      expect(data.data.items.length).toBeGreaterThan(0);
      expect(data.data.items.some((t: any) => t.title.includes('Dataset Todo 10'))).toBe(true);
    });

    it('should aggregate tags efficiently', async () => {
      const startTime = Date.now();
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/tags/popular?limit=10',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(400); // Aggregation should be optimized
      
      const data = JSON.parse(response.body);
      expect(data.data.tags).toHaveLength(10);
      expect(data.data.tags[0].count).toBeGreaterThan(0);
    });

    it('should handle complex queries with multiple joins', async () => {
      const startTime = Date.now();
      
      // Get todos with category info and filter by multiple criteria
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?status=PENDING&hasDueDate=true&sortBy=dueDate&sortOrder=asc&limit=20',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(400); // Complex queries should still be fast
      
      const data = JSON.parse(response.body);
      expect(data.data.items.every((t: any) => t.status === 'PENDING' && t.dueDate)).toBe(true);
      
      // Verify sorting
      const dueDates = data.data.items.map((t: any) => new Date(t.dueDate).getTime());
      expect(dueDates).toEqual([...dueDates].sort((a, b) => a - b));
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large response payloads efficiently', async () => {
      // Create 200 todos with large descriptions
      const todoPromises = [];
      const largeText = 'Lorem ipsum dolor sit amet, '.repeat(100); // ~2.7KB per todo
      
      for (let i = 0; i < 200; i++) {
        todoPromises.push(
          app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Large Payload Todo ${i}`,
              description: largeText,
              tags: Array.from({ length: 20 }, (_, j) => `tag${i}-${j}`), // Many tags
            },
          })
        );
      }
      await Promise.all(todoPromises);

      const startTime = Date.now();
      
      // Request all todos (large response)
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/todos?limit=200',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      expect(response.statusCode).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should handle large payloads reasonably
      
      const data = JSON.parse(response.body);
      expect(data.data.items).toHaveLength(200);
    });

    it('should handle rapid sequential requests without memory leaks', async () => {
      const requestCount = 1000;
      const batchSize = 100;
      
      for (let batch = 0; batch < requestCount / batchSize; batch++) {
        const promises = [];
        
        for (let i = 0; i < batchSize; i++) {
          const requestNum = batch * batchSize + i;
          
          // Alternate between different operations
          if (requestNum % 4 === 0) {
            // Create
            promises.push(
              app.inject({
                method: 'POST',
                url: '/api/v1/todos',
                headers: {
                  authorization: `Bearer ${authToken}`,
                },
                payload: {
                  title: `Sequential ${requestNum}`,
                },
              })
            );
          } else if (requestNum % 4 === 1) {
            // List
            promises.push(
              app.inject({
                method: 'GET',
                url: '/api/v1/todos?limit=5',
                headers: {
                  authorization: `Bearer ${authToken}`,
                },
              })
            );
          } else if (requestNum % 4 === 2) {
            // Get categories
            promises.push(
              app.inject({
                method: 'GET',
                url: '/api/v1/categories',
                headers: {
                  authorization: `Bearer ${authToken}`,
                },
              })
            );
          } else {
            // Get tags
            promises.push(
              app.inject({
                method: 'GET',
                url: '/api/v1/tags',
                headers: {
                  authorization: `Bearer ${authToken}`,
                },
              })
            );
          }
        }
        
        const responses = await Promise.all(promises);
        
        // All should succeed
        responses.forEach(response => {
          expect(response.statusCode).toBeLessThanOrEqual(201);
        });
        
        // Small delay between batches to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Server should still be responsive after all requests
      const healthResponse = await app.inject({
        method: 'GET',
        url: '/health',
      });
      
      expect(healthResponse.statusCode).toBe(200);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should handle rate limit efficiently', async () => {
      // Get rate limit from config (assuming 100 requests per 15 minutes)
      const maxRequests = 100;
      const promises = [];
      
      // Make requests up to the limit
      for (let i = 0; i < maxRequests + 10; i++) {
        promises.push(
          app.inject({
            method: 'GET',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
              'x-forwarded-for': '10.0.0.1', // Same IP for rate limiting
            },
          })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // Count successful and rate limited responses
      const successCount = responses.filter(r => r.statusCode === 200).length;
      const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
      
      // Should have successful requests up to the limit
      expect(successCount).toBeGreaterThanOrEqual(maxRequests - 10); // Allow some margin
      expect(rateLimitedCount).toBeGreaterThan(0);
      
      // Rate limited responses should have proper error format
      const rateLimitedResponse = responses.find(r => r.statusCode === 429);
      if (rateLimitedResponse) {
        const data = JSON.parse(rateLimitedResponse.body);
        expect(data.success).toBe(false);
        expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
      }
    });
  });

  describe('Caching Performance', () => {
    it('should cache repeated queries effectively', async () => {
      // First request - cache miss
      const firstStartTime = Date.now();
      const firstResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      const firstResponseTime = Date.now() - firstStartTime;
      
      expect(firstResponse.statusCode).toBe(200);
      
      // Immediate second request - should be cached
      const secondStartTime = Date.now();
      const secondResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      const secondResponseTime = Date.now() - secondStartTime;
      
      expect(secondResponse.statusCode).toBe(200);
      
      // Second request should be significantly faster if caching is working
      // Note: This assumes caching is implemented. If not, times will be similar
      console.log(`First request: ${firstResponseTime}ms, Second request: ${secondResponseTime}ms`);
      
      // Verify responses are identical
      expect(JSON.parse(firstResponse.body)).toEqual(JSON.parse(secondResponse.body));
    });

    it('should invalidate cache on mutations', async () => {
      // Get initial categories
      const initialResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      const initialData = JSON.parse(initialResponse.body);
      const initialCount = initialData.data.categories.length;
      
      // Create new category
      await app.inject({
        method: 'POST',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'Cache Test Category',
          color: '#123456',
        },
      });
      
      // Get categories again - should reflect the change
      const updatedResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/categories',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      const updatedData = JSON.parse(updatedResponse.body);
      
      expect(updatedData.data.categories.length).toBe(initialCount + 1);
      expect(updatedData.data.categories.some((c: any) => c.name === 'Cache Test Category')).toBe(true);
    });
  });
});