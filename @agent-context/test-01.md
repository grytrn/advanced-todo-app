# @test-01 - QA Engineer Context

## Current Focus
- Setting up test infrastructure
- Waiting for auth API to write integration tests
- Establishing test patterns and utilities

## Test Strategy Overview

### Test Pyramid
```
         /\        E2E Tests (10%)
        /  \       - Critical user journeys
       /    \      - Smoke tests for deploys
      /------\     
     /        \    Integration Tests (30%)
    /          \   - API endpoint tests
   /            \  - Service integration
  /--------------\ 
 /                \ Unit Tests (60%)
/                  \- Business logic
                    - Utilities
                    - Components
```

### Test Infrastructure Setup

#### Backend Testing
```typescript
// backend/tests/setup.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let prisma: PrismaClient;

beforeAll(async () => {
  // Use separate test database
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  
  // Run migrations
  execSync('npx prisma migrate deploy', { env: process.env });
  
  prisma = new PrismaClient();
});

afterEach(async () => {
  // Clean up test data
  const tables = ['User', 'Product', 'Order'];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

#### Frontend Testing
```typescript
// frontend/tests/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// MSW for API mocking
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};
```

### E2E Test Framework (Playwright)

#### Configuration
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 12'] } }
  ]
});
```

#### Page Object Pattern
```typescript
// tests/e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  
  async goto() {
    await this.page.goto('/login');
  }
  
  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
  }
  
  async expectError(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]'))
      .toContainText(message);
  }
}
```

### Test Data Management

#### Factories
```typescript
// tests/factories/user.factory.ts
export const userFactory = {
  build: (overrides = {}) => ({
    email: faker.internet.email(),
    password: 'Test123!',
    name: faker.person.fullName(),
    role: 'USER',
    ...overrides
  }),
  
  create: async (overrides = {}) => {
    const user = userFactory.build(overrides);
    const hashedPassword = await bcrypt.hash(user.password, 10);
    
    return prisma.user.create({
      data: { ...user, password: hashedPassword }
    });
  }
};
```

#### Seeders
```typescript
// tests/seeds/e2e.seed.ts
export async function seedE2EData() {
  // Create test users
  const testUser = await userFactory.create({
    email: 'test@example.com',
    password: 'TestPassword123!'
  });
  
  const adminUser = await userFactory.create({
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    role: 'ADMIN'
  });
  
  // Create test products
  const products = await Promise.all(
    Array.from({ length: 20 }, () => productFactory.create())
  );
  
  return { testUser, adminUser, products };
}
```

## Test Patterns & Best Practices

### API Testing Pattern
```typescript
describe('POST /api/v1/auth/register', () => {
  it('should register a new user', async () => {
    const userData = userFactory.build();
    
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);
    
    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          email: userData.email,
          name: userData.name
        }
      }
    });
    
    // Verify in database
    const user = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    expect(user).toBeTruthy();
    expect(user.password).not.toBe(userData.password); // Should be hashed
  });
  
  it('should return validation error for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...userFactory.build(), email: 'invalid-email' })
      .expect(400);
    
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### Component Testing Pattern
```typescript
describe('ProductList', () => {
  it('should display products', async () => {
    const products = Array.from({ length: 3 }, () => productFactory.build());
    
    server.use(
      rest.get('/api/v1/products', (req, res, ctx) => {
        return res(ctx.json({
          success: true,
          data: { items: products }
        }));
      })
    );
    
    render(<ProductList />);
    
    // Wait for products to load
    await waitFor(() => {
      products.forEach(product => {
        expect(screen.getByText(product.name)).toBeInTheDocument();
      });
    });
  });
});
```

## Coverage Requirements

### Backend Coverage Goals
- **Overall**: 80% minimum
- **Auth Module**: 100% (critical path)
- **Payment Module**: 100% (critical path)
- **API Routes**: 90%
- **Services**: 85%
- **Utilities**: 70%

### Frontend Coverage Goals
- **Overall**: 80% minimum
- **Components**: 85%
- **Hooks**: 90%
- **Utils**: 95%
- **Pages**: 70%

## Performance Testing

### Load Testing with k6
```javascript
// tests/load/auth.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1']     // Error rate under 10%
  }
};

export default function() {
  const response = http.post('http://localhost:8000/api/v1/auth/login', {
    email: 'test@example.com',
    password: 'TestPassword123!'
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has access token': (r) => JSON.parse(r.body).data.accessToken
  });
  
  sleep(1);
}
```

## CI/CD Integration

### GitHub Actions Test Pipeline
```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_PASSWORD: postgres
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
  
  steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: |
        npm run test:backend -- --coverage
        npm run test:frontend -- --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

## Questions & Blockers

**For @backend-01**:
1. Auth endpoints ready for integration tests?
2. Test user credentials for E2E?
3. Rate limiting behavior in tests?

**For @frontend-01**:
1. Test ID convention agreed?
2. MSW handlers needed?
3. Visual regression testing needed?

**For @devops-01**:
1. Test database provisioning in CI?
2. E2E test environment?
3. Performance test infrastructure?

## Test Utilities Created

### Custom Matchers
```typescript
// tests/matchers/api.matchers.ts
expect.extend({
  toBeSuccessResponse(received) {
    const pass = received.success === true && 'data' in received;
    return {
      pass,
      message: () => `expected ${received} to be a success response`
    };
  },
  
  toBeErrorResponse(received, code) {
    const pass = received.success === false && 
                 received.error?.code === code;
    return {
      pass,
      message: () => `expected error code ${code}, got ${received.error?.code}`
    };
  }
});
```

## Next Tasks
1. Complete auth integration tests (blocked)
2. Set up visual regression tests
3. Create E2E smoke test suite
4. Document test conventions
5. Set up test reporting dashboard
6. Create performance baselines
