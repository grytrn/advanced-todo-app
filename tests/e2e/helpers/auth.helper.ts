import { Page } from '@playwright/test';
import { testUsers } from '../../fixtures/users';

export class AuthHelper {
  constructor(private page: Page) {}

  async register(userData = testUsers.alice) {
    await this.page.goto('/register');
    
    await this.page.fill('[name="name"]', userData.name);
    await this.page.fill('[name="email"]', userData.email);
    await this.page.fill('[name="password"]', userData.password);
    await this.page.fill('[name="confirmPassword"]', userData.password);
    
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or login
    await this.page.waitForURL(/\/(dashboard|login)/);
  }

  async login(userData = testUsers.alice) {
    await this.page.goto('/login');
    
    await this.page.fill('[name="email"]', userData.email);
    await this.page.fill('[name="password"]', userData.password);
    
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('/dashboard');
  }

  async logout() {
    // Click user menu
    await this.page.click('[data-testid="user-menu"]');
    
    // Click logout
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for redirect to home or login
    await this.page.waitForURL(/\/(home|login|$)/);
  }

  async ensureLoggedIn(userData = testUsers.alice) {
    // Check if already logged in
    const isLoggedIn = await this.page.locator('[data-testid="user-menu"]').isVisible();
    
    if (!isLoggedIn) {
      await this.login(userData);
    }
  }

  async getAuthToken(): Promise<string | null> {
    // Get token from localStorage or cookies
    const token = await this.page.evaluate(() => {
      return localStorage.getItem('authToken');
    });
    
    return token;
  }
}