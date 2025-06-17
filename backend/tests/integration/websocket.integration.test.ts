import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import WebSocket from 'ws';
import { buildApp } from '../../src/app';

describe('WebSocket Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let userId: string;
  let wsClient: WebSocket;
  let wsUrl: string;

  const testUser = {
    email: `ws-test-${Date.now()}@example.com`,
    password: 'Test123!@#',
    name: 'WebSocket Test User',
  };

  beforeAll(async () => {
    app = await buildApp();
    prisma = new PrismaClient();
    
    // Start the server to get the port
    await app.listen({ port: 0 }); // 0 = random available port
    const address = app.server.address();
    const port = typeof address === 'object' ? address?.port : 8000;
    wsUrl = `ws://localhost:${port}/ws`;
    
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
    // Close WebSocket connection
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
    // Clean up todos after each test
    await prisma.todo.deleteMany({ where: { userId } });
  });

  describe('WebSocket Connection', () => {
    it('should connect with valid auth token', (done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      wsClient.on('open', () => {
        expect(wsClient.readyState).toBe(WebSocket.OPEN);
        done();
      });
      
      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should reject connection without auth token', (done) => {
      wsClient = new WebSocket(wsUrl);
      
      wsClient.on('error', () => {
        // Expected to fail
        done();
      });
      
      wsClient.on('close', (code) => {
        expect(code).toBe(1008); // Policy violation
        done();
      });
      
      wsClient.on('open', () => {
        done(new Error('Should not connect without auth'));
      });
    });

    it('should reject connection with invalid auth token', (done) => {
      wsClient = new WebSocket(`${wsUrl}?token=invalid-token`);
      
      wsClient.on('error', () => {
        // Expected to fail
        done();
      });
      
      wsClient.on('close', (code) => {
        expect(code).toBe(1008); // Policy violation
        done();
      });
      
      wsClient.on('open', () => {
        done(new Error('Should not connect with invalid token'));
      });
    });
  });

  describe('Real-time TODO Events', () => {
    beforeEach((done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      wsClient.on('open', () => done());
    });

    it('should receive todo:created event when creating todo', (done) => {
      wsClient.on('message', (data) => {
        const event = JSON.parse(data.toString());
        expect(event.type).toBe('todo:created');
        expect(event.data.todo.title).toBe('Real-time Test');
        expect(event.data.todo.userId).toBe(userId);
        done();
      });

      // Create a todo after WebSocket is connected
      setTimeout(async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            title: 'Real-time Test',
            priority: 'HIGH',
          },
        });
      }, 100);
    });

    it('should receive todo:updated event when updating todo', (done) => {
      let todoId: string;
      let messageCount = 0;

      wsClient.on('message', (data) => {
        const event = JSON.parse(data.toString());
        messageCount++;

        if (messageCount === 1) {
          // First message: todo created
          expect(event.type).toBe('todo:created');
          todoId = event.data.todo.id;
          
          // Update the todo
          setTimeout(async () => {
            await app.inject({
              method: 'PATCH',
              url: `/api/v1/todos/${todoId}`,
              headers: {
                authorization: `Bearer ${authToken}`,
              },
              payload: {
                title: 'Updated Title',
                priority: 'URGENT',
              },
            });
          }, 100);
        } else if (messageCount === 2) {
          // Second message: todo updated
          expect(event.type).toBe('todo:updated');
          expect(event.data.todo.id).toBe(todoId);
          expect(event.data.todo.title).toBe('Updated Title');
          expect(event.data.todo.priority).toBe('URGENT');
          done();
        }
      });

      // Create initial todo
      setTimeout(async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            title: 'Original Title',
            priority: 'LOW',
          },
        });
      }, 100);
    });

    it('should receive todo:deleted event when deleting todo', (done) => {
      let todoId: string;
      let messageCount = 0;

      wsClient.on('message', (data) => {
        const event = JSON.parse(data.toString());
        messageCount++;

        if (messageCount === 1) {
          // First message: todo created
          expect(event.type).toBe('todo:created');
          todoId = event.data.todo.id;
          
          // Delete the todo
          setTimeout(async () => {
            await app.inject({
              method: 'DELETE',
              url: `/api/v1/todos/${todoId}`,
              headers: {
                authorization: `Bearer ${authToken}`,
              },
            });
          }, 100);
        } else if (messageCount === 2) {
          // Second message: todo deleted
          expect(event.type).toBe('todo:deleted');
          expect(event.data.todoId).toBe(todoId);
          done();
        }
      });

      // Create initial todo
      setTimeout(async () => {
        await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            title: 'To be deleted',
          },
        });
      }, 100);
    });

    it('should receive todo:reordered event when reordering todos', (done) => {
      let todoIds: string[] = [];
      let messageCount = 0;

      wsClient.on('message', (data) => {
        const event = JSON.parse(data.toString());
        
        if (event.type === 'todo:created') {
          messageCount++;
          todoIds.push(event.data.todo.id);
          
          // After creating all todos, reorder them
          if (messageCount === 3) {
            setTimeout(async () => {
              await app.inject({
                method: 'POST',
                url: '/api/v1/todos/reorder',
                headers: {
                  authorization: `Bearer ${authToken}`,
                },
                payload: {
                  todoIds: todoIds.reverse(), // Reverse order
                },
              });
            }, 100);
          }
        } else if (event.type === 'todo:reordered') {
          expect(event.data.todoIds).toEqual(todoIds);
          expect(event.data.todos).toHaveLength(3);
          done();
        }
      });

      // Create multiple todos
      setTimeout(async () => {
        for (let i = 1; i <= 3; i++) {
          await app.inject({
            method: 'POST',
            url: '/api/v1/todos',
            headers: {
              authorization: `Bearer ${authToken}`,
            },
            payload: {
              title: `Todo ${i}`,
            },
          });
        }
      }, 100);
    });

    it('should only receive events for own todos', (done) => {
      // Create another user
      let otherUserToken: string;
      let otherUserId: string;
      
      beforeAll(async () => {
        const otherUser = {
          email: `other-ws-${Date.now()}@example.com`,
          password: 'Test123!@#',
          name: 'Other WS User',
        };
        
        const otherUserResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: otherUser,
        });
        
        const otherUserData = JSON.parse(otherUserResponse.body);
        otherUserToken = otherUserData.data.accessToken;
        otherUserId = otherUserData.data.user.id;
      });

      let receivedOwnTodo = false;
      let timeout: NodeJS.Timeout;

      wsClient.on('message', (data) => {
        const event = JSON.parse(data.toString());
        
        if (event.type === 'todo:created') {
          // Should only receive own todo
          expect(event.data.todo.title).toBe('My Todo');
          expect(event.data.todo.userId).toBe(userId);
          receivedOwnTodo = true;
          
          // Wait a bit to ensure we don't receive other user's todo
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            expect(receivedOwnTodo).toBe(true);
            done();
          }, 500);
        }
      });

      // Create todos for both users
      setTimeout(async () => {
        // Own todo
        await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: {
            title: 'My Todo',
          },
        });

        // Other user's todo
        await app.inject({
          method: 'POST',
          url: '/api/v1/todos',
          headers: {
            authorization: `Bearer ${otherUserToken}`,
          },
          payload: {
            title: 'Other User Todo',
          },
        });
      }, 100);

      // Clean up
      afterAll(async () => {
        await prisma.todo.deleteMany({ where: { userId: otherUserId } });
        await prisma.user.delete({ where: { id: otherUserId } });
      });
    });
  });

  describe('WebSocket Performance', () => {
    it('should handle rapid message delivery', (done) => {
      const todoCount = 10;
      let receivedCount = 0;
      const receivedTodos = new Set<string>();

      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      wsClient.on('open', async () => {
        wsClient.on('message', (data) => {
          const event = JSON.parse(data.toString());
          
          if (event.type === 'todo:created') {
            receivedCount++;
            receivedTodos.add(event.data.todo.id);
            
            if (receivedCount === todoCount) {
              expect(receivedTodos.size).toBe(todoCount);
              done();
            }
          }
        });

        // Create todos rapidly
        const promises = [];
        for (let i = 0; i < todoCount; i++) {
          promises.push(
            app.inject({
              method: 'POST',
              url: '/api/v1/todos',
              headers: {
                authorization: `Bearer ${authToken}`,
              },
              payload: {
                title: `Rapid Todo ${i}`,
              },
            })
          );
        }
        
        await Promise.all(promises);
      });
    });

    it('should handle multiple concurrent connections', (done) => {
      const clientCount = 5;
      const clients: WebSocket[] = [];
      let connectedCount = 0;
      let messageReceivedCount = 0;

      // Create multiple WebSocket connections
      for (let i = 0; i < clientCount; i++) {
        const client = new WebSocket(`${wsUrl}?token=${authToken}`);
        clients.push(client);

        client.on('open', () => {
          connectedCount++;
          
          if (connectedCount === clientCount) {
            // All clients connected, set up message handlers
            clients.forEach((c, index) => {
              c.on('message', (data) => {
                const event = JSON.parse(data.toString());
                
                if (event.type === 'todo:created') {
                  messageReceivedCount++;
                  
                  // Each client should receive the message
                  if (messageReceivedCount === clientCount) {
                    // Clean up
                    clients.forEach(cl => cl.close());
                    done();
                  }
                }
              });
            });

            // Create a todo
            setTimeout(async () => {
              await app.inject({
                method: 'POST',
                url: '/api/v1/todos',
                headers: {
                  authorization: `Bearer ${authToken}`,
                },
                payload: {
                  title: 'Broadcast Test',
                },
              });
            }, 100);
          }
        });
      }
    });
  });

  describe('WebSocket Error Handling', () => {
    it('should handle client disconnect gracefully', (done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      wsClient.on('open', () => {
        // Abruptly close the connection
        wsClient.terminate();
        
        // Server should continue functioning
        setTimeout(async () => {
          const response = await app.inject({
            method: 'GET',
            url: '/health',
          });
          
          expect(response.statusCode).toBe(200);
          done();
        }, 100);
      });
    });

    it('should handle malformed messages', (done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      wsClient.on('open', () => {
        // Send malformed JSON
        wsClient.send('not valid json');
        
        // Should not crash the server
        setTimeout(async () => {
          const response = await app.inject({
            method: 'GET',
            url: '/health',
          });
          
          expect(response.statusCode).toBe(200);
          done();
        }, 100);
      });
    });

    it('should handle ping/pong for connection health', (done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      let pongReceived = false;
      
      wsClient.on('open', () => {
        wsClient.on('pong', () => {
          pongReceived = true;
        });
        
        // Send ping
        wsClient.ping();
        
        // Check if pong was received
        setTimeout(() => {
          expect(pongReceived).toBe(true);
          done();
        }, 100);
      });
    });
  });
});