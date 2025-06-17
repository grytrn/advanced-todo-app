# @backend-01 - Backend Developer Context

## Current Focus
- Implementing JWT authentication system
- Working on: `feature/backend-auth` branch
- Next: User profile endpoints after auth completion

## Work in Progress

### Authentication Implementation Status
- [x] User model with Prisma
- [x] Password hashing with bcrypt
- [x] JWT token generation
- [ ] Refresh token rotation
- [ ] Rate limiting on auth endpoints
- [ ] Password reset flow
- [ ] Email verification

### Current Blockers
- Deciding on session storage: Redis vs JWT-only
- Need clarity on password requirements from @arch-01

## Code Snippets & Patterns

### JWT Service Structure
```typescript
// services/auth.service.ts
export class AuthService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  
  async generateTokenPair(userId: string): Promise<TokenPair> {
    const payload = { sub: userId, type: 'access' };
    
    const accessToken = await this.signToken(payload, this.accessTokenExpiry);
    const refreshToken = await this.signToken(
      { ...payload, type: 'refresh' },
      this.refreshTokenExpiry
    );
    
    // Store refresh token in Redis
    await this.redis.setex(
      `refresh:${userId}`,
      7 * 24 * 60 * 60,
      refreshToken
    );
    
    return { accessToken, refreshToken };
  }
}
```

### Validation Schemas
```typescript
// Using Zod for validation
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(2).max(100)
});
```

## Database Queries Optimization

### Indexes Needed
```sql
-- Add after MVP launch based on query patterns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

## API Design Decisions

### Endpoint Naming
- RESTful conventions
- Plural nouns: `/users`, `/products`
- Actions as sub-resources: `/auth/refresh`, `/auth/logout`
- Version in URL: `/api/v1/...`

### Error Responses
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid input',
    details: {
      email: 'Invalid email format',
      password: 'Password too weak'
    }
  }
}
```

## Testing Notes

### Test Data Builders
```typescript
export const createTestUser = (overrides = {}) => ({
  email: faker.internet.email(),
  password: 'Test123!',
  name: faker.person.fullName(),
  ...overrides
});
```

### Integration Test Pattern
- Use real database (test db)
- Clean up after each test
- Test full request/response cycle
- No mocking of external services

## Questions & Clarifications Needed

**For @arch-01**:
1. Session management: Pure JWT or hybrid with Redis sessions?
2. Password requirements: Minimum complexity rules?
3. Account lockout after failed attempts?

**For @frontend-01**:
1. Need CORS origins for local development
2. Cookie settings for refresh tokens (SameSite, Secure)
3. Preferred date format in responses

**For @test-01**:
1. Test database seeding strategy?
2. E2E test user credentials management?

## Performance Considerations
- bcrypt rounds: 10 (balanced security/speed)
- Database connection pool: 10 connections
- Redis connection pool: 50 connections
- Request timeout: 30 seconds

## Useful Commands
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run migrate

# Open Prisma Studio
npx prisma studio

# Test specific endpoint
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","name":"Test User"}'
```

## Todo Before Handoff
- [ ] Complete refresh token rotation
- [ ] Add rate limiting
- [ ] Write API documentation
- [ ] Update @api-contracts
- [ ] 100% test coverage for auth
- [ ] Security review checklist
