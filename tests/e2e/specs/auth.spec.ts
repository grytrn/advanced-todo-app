import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth.helper';
import { testUsers } from '../../fixtures/users';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
  });

  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const uniqueUser = {
        ...testUsers.alice,
        email: `alice${Date.now()}@example.com`,
      };

      await authHelper.register(uniqueUser);

      // Should redirect to dashboard or login
      expect(page.url()).toMatch(/\/(dashboard|login)/);

      // Should show success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/register');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      // First registration
      const uniqueUser = {
        ...testUsers.alice,
        email: `duplicate${Date.now()}@example.com`,
      };
      await authHelper.register(uniqueUser);

      // Try to register with same email
      await authHelper.register(uniqueUser);

      // Should show error
      await expect(page.locator('text=Email already exists')).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      // Register first
      const uniqueUser = {
        ...testUsers.alice,
        email: `login${Date.now()}@example.com`,
      };
      await authHelper.register(uniqueUser);

      // Login
      await authHelper.login(uniqueUser);

      // Should be on dashboard
      expect(page.url()).toContain('/dashboard');

      // Should show user menu
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[name="email"]', 'nonexistent@example.com');
      await page.fill('[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should redirect to login when accessing protected routes', async ({ page }) => {
      // Try to access dashboard without login
      await page.goto('/dashboard');

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Register and login
      const uniqueUser = {
        ...testUsers.alice,
        email: `logout${Date.now()}@example.com`,
      };
      await authHelper.register(uniqueUser);
      await authHelper.login(uniqueUser);

      // Logout
      await authHelper.logout();

      // Should redirect to home or login
      expect(page.url()).toMatch(/\/(home|login|$)/);

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Session Management', () => {
    test('should persist session on page refresh', async ({ page }) => {
      // Register and login
      const uniqueUser = {
        ...testUsers.alice,
        email: `session${Date.now()}@example.com`,
      };
      await authHelper.register(uniqueUser);
      await authHelper.login(uniqueUser);

      // Refresh page
      await page.reload();

      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      expect(page.url()).toContain('/dashboard');
    });

    test('should handle expired tokens gracefully', async ({ page }) => {
      // This test would require backend support for token expiration
      // For now, we'll test the UI behavior when API returns 401
      
      await page.route('**/api/v1/auth/me', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: 'Token expired',
            },
          }),
        });
      });

      await page.goto('/dashboard');

      // Should redirect to login
      expect(page.url()).toContain('/login');

      // Should show message
      await expect(page.locator('text=Session expired')).toBeVisible();
    });
  });
});