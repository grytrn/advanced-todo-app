import { testUsers } from '../fixtures/users';
import { testTodos } from '../fixtures/todos';
import { TestApiClient } from './api-client';

export async function createTestUser(
  client: TestApiClient,
  userData = testUsers.alice
) {
  const response = await client.register(userData);
  return response.data;
}

export async function loginTestUser(
  client: TestApiClient,
  userData = testUsers.alice
) {
  // Register if not exists
  try {
    await client.register(userData);
  } catch (error: any) {
    if (error.response?.status !== 409) {
      throw error;
    }
  }
  
  // Login
  const response = await client.login({
    email: userData.email,
    password: userData.password,
  });
  
  return response.data;
}

export async function createTestTodos(
  client: TestApiClient,
  todos = testTodos.personal
) {
  const created = [];
  
  for (const todo of todos) {
    const response = await client.createTodo(todo);
    created.push(response.data);
  }
  
  return created;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomString(length: number = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function expectApiSuccess(response: any) {
  expect(response).toHaveProperty('success', true);
  expect(response).toHaveProperty('data');
  expect(response).not.toHaveProperty('error');
}

export function expectApiError(response: any, errorCode?: string) {
  expect(response).toHaveProperty('success', false);
  expect(response).toHaveProperty('error');
  expect(response.error).toHaveProperty('message');
  
  if (errorCode) {
    expect(response.error).toHaveProperty('code', errorCode);
  }
}

export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  
  return { result, duration };
}

export function generateLargeTodoList(count: number) {
  const todos = [];
  const priorities = ['low', 'medium', 'high'];
  const statuses = ['pending', 'in_progress', 'completed'];
  
  for (let i = 0; i < count; i++) {
    todos.push({
      title: `Todo ${i + 1}`,
      description: `Description for todo ${i + 1}`,
      priority: priorities[i % 3],
      status: statuses[i % 3],
      tags: [`tag${(i % 5) + 1}`, `category${(i % 3) + 1}`],
      dueDate: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)),
    });
  }
  
  return todos;
}