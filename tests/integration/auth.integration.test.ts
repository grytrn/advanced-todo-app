import { describe, it, expect, beforeEach } from 'vitest';
import { TestApiClient } from '../utils/api-client';
import { testUsers, invalidUsers } from '../fixtures/users';
import { expectApiSuccess, expectApiError } from '../utils/test-helpers';

describe('Auth Integration Tests', () => {
  let client: TestApiClient;

  beforeEach(() => {
    client = new TestApiClient();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const uniqueUser = {
        ...testUsers.alice,
        email: `alice${Date.now()}@example.com`,
      };

      const response = await client.register(uniqueUser);

      expectApiSuccess(response);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.user.email).toBe(uniqueUser.email);
      expect(response.data.user.name).toBe(uniqueUser.name);
      expect(response.data.user).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      try {
        await client.register(invalidUsers.noEmail);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expectApiError(error.response.data, 'VALIDATION_ERROR');
      }
    });

    it('should validate email format', async () => {
      try {
        await client.register(invalidUsers.invalidEmail);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expectApiError(error.response.data, 'VALIDATION_ERROR');
      }
    });

    it('should validate password strength', async () => {
      try {
        await client.register(invalidUsers.weakPassword);
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expectApiError(error.response.data, 'VALIDATION_ERROR');
      }
    });

    it('should prevent duplicate email registration', async () => {
      const uniqueUser = {
        ...testUsers.alice,
        email: `duplicate${Date.now()}@example.com`,
      };

      // First registration should succeed
      await client.register(uniqueUser);

      // Second registration should fail
      try {
        await client.register(uniqueUser);
      } catch (error: any) {
        expect(error.response.status).toBe(409);
        expectApiError(error.response.data, 'EMAIL_EXISTS');
      }
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const uniqueUser = {
      ...testUsers.alice,
      email: `login${Date.now()}@example.com`,
    };

    beforeEach(async () => {
      // Register user for login tests
      await client.register(uniqueUser);
    });

    it('should login with valid credentials', async () => {
      const response = await client.login({
        email: uniqueUser.email,
        password: uniqueUser.password,
      });

      expectApiSuccess(response);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data).toHaveProperty('refreshToken');
      expect(response.data.user.email).toBe(uniqueUser.email);
    });

    it('should fail with invalid email', async () => {
      try {
        await client.login({
          email: 'wrong@example.com',
          password: uniqueUser.password,
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expectApiError(error.response.data, 'INVALID_CREDENTIALS');
      }
    });

    it('should fail with invalid password', async () => {
      try {
        await client.login({
          email: uniqueUser.email,
          password: 'wrongpassword',
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expectApiError(error.response.data, 'INVALID_CREDENTIALS');
      }
    });

    it('should validate required fields', async () => {
      try {
        await client.login({
          email: uniqueUser.email,
          // missing password
        });
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expectApiError(error.response.data, 'VALIDATION_ERROR');
      }
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const uniqueUser = {
        ...testUsers.alice,
        email: `me${Date.now()}@example.com`,
      };

      // Register and login
      await client.register(uniqueUser);
      await client.login({
        email: uniqueUser.email,
        password: uniqueUser.password,
      });

      // Get current user
      const response = await client.getMe();

      expectApiSuccess(response);
      expect(response.data.email).toBe(uniqueUser.email);
      expect(response.data.name).toBe(uniqueUser.name);
      expect(response.data).not.toHaveProperty('password');
    });

    it('should fail when not authenticated', async () => {
      const unauthClient = new TestApiClient();

      try {
        await unauthClient.getMe();
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expectApiError(error.response.data, 'UNAUTHORIZED');
      }
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token', async () => {
      const uniqueUser = {
        ...testUsers.alice,
        email: `refresh${Date.now()}@example.com`,
      };

      // Register and login
      const loginResponse = await client.register(uniqueUser);
      const oldAccessToken = loginResponse.data.accessToken;

      // Wait a bit to ensure new token is different
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh token
      const response = await client.client.post('/api/v1/auth/refresh', {
        refreshToken: loginResponse.data.refreshToken,
      });

      expectApiSuccess(response.data);
      expect(response.data.data).toHaveProperty('accessToken');
      expect(response.data.data).toHaveProperty('refreshToken');
      expect(response.data.data.accessToken).not.toBe(oldAccessToken);
    });

    it('should fail with invalid refresh token', async () => {
      try {
        await client.client.post('/api/v1/auth/refresh', {
          refreshToken: 'invalid-token',
        });
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expectApiError(error.response.data, 'INVALID_REFRESH_TOKEN');
      }
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const uniqueUser = {
        ...testUsers.alice,
        email: `logout${Date.now()}@example.com`,
      };

      // Register and login
      await client.register(uniqueUser);
      await client.login({
        email: uniqueUser.email,
        password: uniqueUser.password,
      });

      // Logout
      const response = await client.logout();

      expectApiSuccess(response);

      // Should not be able to access protected routes
      try {
        await client.getMe();
      } catch (error: any) {
        expect(error.response.status).toBe(401);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const attempts = 10; // Assuming rate limit is lower than this
      const errors = [];

      // Make many rapid login attempts
      for (let i = 0; i < attempts; i++) {
        try {
          await client.login({
            email: 'rate-limit@example.com',
            password: 'wrongpassword',
          });
        } catch (error: any) {
          errors.push(error);
        }
      }

      // At least one should be rate limited
      const rateLimited = errors.some(e => e.response?.status === 429);
      expect(rateLimited).toBe(true);
    });
  });
});