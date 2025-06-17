# Testing Strategy for TODO App

## Overview

This document outlines the comprehensive testing strategy for the TODO application, covering unit tests, integration tests, and end-to-end (E2E) tests.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests with Playwright
│   ├── specs/             # Test specifications
│   ├── helpers/           # Page object models and helpers
│   └── playwright.config.ts
├── integration/           # Cross-service integration tests
│   ├── *.integration.test.ts
│   └── vitest.config.ts
├── fixtures/              # Shared test data
│   ├── users.ts
│   └── todos.ts
└── utils/                 # Shared test utilities
    ├── api-client.ts
    └── test-helpers.ts

backend/tests/             # Backend-specific tests
├── unit/                 # Unit tests for services, utils
├── integration/          # API endpoint tests
└── setup.ts             # Test setup and teardown

frontend/tests/           # Frontend-specific tests
├── unit/                # Component unit tests
├── integration/         # Hook and service tests
└── setup.ts            # Test setup with mocks
```

## Running Tests

### Prerequisites

```bash
# Install all dependencies
npm run install:all

# Install Playwright browsers (first time only)
cd tests/e2e && npm run install:browsers

# Set up test database
createdb todoapp_test
```

### Environment Setup

Create `.env.test` files:

**Backend `.env.test`:**
```env
NODE_ENV=test
DATABASE_URL=postgresql://user:pass@localhost:5432/todoapp_test
JWT_SECRET=test-jwt-secret
REDIS_URL=redis://localhost:6379/1
```

**E2E `.env.test`:**
```env
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:8000
```

### Running Different Test Suites

```bash
# Run all tests
npm test

# Backend tests
npm run test:backend
npm run test:backend -- --watch
npm run test:backend -- --coverage

# Frontend tests
npm run test:frontend
npm run test:frontend -- --watch
npm run test:frontend -- --coverage
npm run test:frontend -- --ui

# Integration tests
cd tests/integration && npm test

# E2E tests
cd tests/e2e && npm test
cd tests/e2e && npm run test:headed  # Run with browser visible
cd tests/e2e && npm run test:chrome   # Chrome only
cd tests/e2e && npm run test:ui      # Interactive UI mode
```

## Test Categories

### 1. Unit Tests (Backend)

Location: `backend/tests/unit/`

**What to test:**
- Service methods
- Utility functions
- Data validation
- Business logic
- Error handling

**Example:**
```typescript
// backend/tests/unit/services/todo.service.test.ts
describe('TodoService', () => {
  it('should create a todo with valid data', async () => {
    const todo = await todoService.create(userId, todoData);
    expect(todo).toHaveProperty('id');
    expect(todo.title).toBe(todoData.title);
  });
});
```

### 2. Unit Tests (Frontend)

Location: `frontend/tests/unit/`

**What to test:**
- React components
- Custom hooks
- Utility functions
- State management
- Form validation

**Example:**
```typescript
// frontend/tests/unit/components/TodoItem.test.tsx
describe('TodoItem', () => {
  it('should render todo details', () => {
    render(<TodoItem todo={mockTodo} />);
    expect(screen.getByText(mockTodo.title)).toBeInTheDocument();
  });
});
```

### 3. Integration Tests (Backend)

Location: `backend/tests/integration/`

**What to test:**
- API endpoints
- Database operations
- Authentication flow
- Request/response validation
- Error responses

**No mocking policy:** Integration tests use real database connections and services.

**Example:**
```typescript
// backend/tests/integration/todos.test.ts
describe('POST /api/v1/todos', () => {
  it('should create a todo for authenticated user', async () => {
    const response = await request(app)
      .post('/api/v1/todos')
      .set('Authorization', `Bearer ${token}`)
      .send(todoData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### 4. Integration Tests (Cross-Service)

Location: `tests/integration/`

**What to test:**
- Multi-service workflows
- API contract validation
- Performance benchmarks
- Data consistency

**Example:**
```typescript
// tests/integration/todo-workflow.test.ts
describe('Complete TODO workflow', () => {
  it('should handle todo lifecycle', async () => {
    // Register user
    const user = await client.register(userData);
    
    // Create todo
    const todo = await client.createTodo(todoData);
    
    // Update todo
    const updated = await client.updateTodo(todo.id, updates);
    
    // Verify changes
    expect(updated.status).toBe('completed');
  });
});
```

### 5. End-to-End Tests

Location: `tests/e2e/specs/`

**What to test:**
- Complete user journeys
- Critical business flows
- Cross-browser compatibility
- Mobile responsiveness
- Performance metrics

**Example:**
```typescript
// tests/e2e/specs/todo-management.spec.ts
test('complete todo workflow', async ({ page }) => {
  // Register and login
  await authHelper.register(testUser);
  await authHelper.login(testUser);
  
  // Create todo
  await todoHelper.createTodo({
    title: 'E2E Test Todo',
    priority: 'high'
  });
  
  // Verify todo appears
  await expect(page.locator('text=E2E Test Todo')).toBeVisible();
  
  // Complete todo
  await todoHelper.toggleTodoComplete('E2E Test Todo');
});
```

## Test Data Management

### Fixtures

Shared test data in `tests/fixtures/`:
- `users.ts` - Test user accounts
- `todos.ts` - Sample TODO items

### Database Seeding

```bash
# Seed test database
cd backend && npm run seed:test

# Reset test database
cd backend && npm run db:reset:test
```

### Test Isolation

- Each test runs in isolation
- Database is cleaned between tests
- No shared state between test files

## Performance Testing

### Load Testing

```typescript
// tests/integration/performance.test.ts
describe('Performance benchmarks', () => {
  it('should handle 100 concurrent todo creations', async () => {
    const { duration } = await measurePerformance('bulk-create', async () => {
      await Promise.all(
        Array(100).fill(null).map(() => client.createTodo(todoData))
      );
    });
    
    expect(duration).toBeLessThan(5000); // 5 seconds
  });
});
```

### Frontend Performance

E2E tests measure:
- Page load time
- Time to interactive
- API response times
- Rendering performance

## Coverage Requirements

### Target Coverage: 90%+

**Critical paths requiring 100% coverage:**
- Authentication (login, register, token refresh)
- Todo CRUD operations
- Data validation
- Error handling
- Security features

### Viewing Coverage Reports

```bash
# Backend coverage
cd backend && npm run test:coverage
open coverage/index.html

# Frontend coverage
cd frontend && npm run test:coverage
open coverage/index.html
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main
- Pre-deployment

### GitHub Actions Workflow

```yaml
test:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      test-suite: [backend, frontend, integration, e2e]
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm run install:all
    - run: npm run test:${{ matrix.test-suite }}
```

## Best Practices

### 1. Test Naming

Use descriptive names that explain what is being tested:
```typescript
// Good
it('should return 404 when todo does not exist')

// Bad
it('should work correctly')
```

### 2. Arrange-Act-Assert

Structure tests clearly:
```typescript
it('should update todo status', async () => {
  // Arrange
  const todo = await createTestTodo();
  
  // Act
  const updated = await todoService.updateStatus(todo.id, 'completed');
  
  // Assert
  expect(updated.status).toBe('completed');
});
```

### 3. Test Data Builders

Use builders for complex test data:
```typescript
const todo = buildTodo({
  title: 'Custom title',
  priority: 'high'
});
```

### 4. Avoid Test Interdependence

Each test should be independent:
```typescript
// Bad - depends on previous test
it('should delete the todo created above', ...)

// Good - creates its own data
it('should delete a todo', async () => {
  const todo = await createTestTodo();
  await deleteTodo(todo.id);
});
```

### 5. Mock External Services Only

- Mock external APIs (e.g., email service)
- Don't mock your own services
- Use real database for integration tests

## Debugging Tests

### Backend Tests

```bash
# Run specific test file
npm run test:backend -- todos.service.test.ts

# Run tests matching pattern
npm run test:backend -- -t "should create"

# Debug mode
node --inspect-brk ./node_modules/.bin/vitest
```

### Frontend Tests

```bash
# Interactive UI mode
npm run test:frontend -- --ui

# Update snapshots
npm run test:frontend -- -u
```

### E2E Tests

```bash
# Debug mode
cd tests/e2e && npm run test:debug

# Generate test code
cd tests/e2e && npm run codegen

# View test report
cd tests/e2e && npm run test:report
```

## Common Issues

### 1. Database Connection Errors

Ensure test database exists and is accessible:
```bash
psql -U postgres -c "CREATE DATABASE todoapp_test;"
```

### 2. Port Conflicts

E2E tests start dev server on ports 3000 and 8000. Ensure they're free.

### 3. Flaky E2E Tests

- Add explicit waits: `await page.waitForSelector()`
- Increase timeouts for slow operations
- Use `waitForLoadState('networkidle')`

### 4. Test Timeouts

Increase timeout for slow tests:
```typescript
test('slow operation', async () => {
  // test code
}, 30000); // 30 seconds
```

## Monitoring Test Health

### Metrics to Track

1. **Test execution time**
2. **Flaky test frequency**
3. **Coverage trends**
4. **Test failure rates**

### Regular Maintenance

- Review and update test data monthly
- Remove obsolete tests
- Refactor slow tests
- Update selectors after UI changes

## Contact

For testing questions or issues:
- Check existing test patterns
- Review this documentation
- Ask in #testing channel
- Tag @test-todo in PRs