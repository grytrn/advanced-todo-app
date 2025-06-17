# @arch-01 - System Architect Context

## Current Focus
- Reviewing authentication implementation by @backend-01
- Planning microservices migration for v2.0
- Evaluating GraphQL adoption for mobile API

## Active Decisions

### 2025-01-15 - Database Schema Patterns
- All tables use UUID primary keys for distributed systems compatibility
- Soft deletes (deleted_at) for audit trails
- Money stored as integers (cents) to avoid floating point issues
- All timestamps in UTC

### 2025-01-15 - Microservices Evaluation
**Status**: Research phase
**Considerations**:
- Current monolith is fine for MVP
- Plan extraction after product-market fit
- First candidate: Notification service
- Keep shared database initially

## Questions for Team

**For @backend-01**: 
- Should we implement database connection pooling now or wait?
- Rate limiting strategy: Redis or in-memory for MVP?

**For @frontend-01**:
- SSR requirements for SEO?
- Progressive Web App considerations?

## Technical Debt Tracking
1. **Database indices**: Need to add after we see query patterns
2. **Caching strategy**: Redis keys need standardization
3. **API versioning**: Consider header-based versioning for v2

## Code Patterns & Standards

### Service Layer Pattern
```typescript
export class UserService {
  constructor(
    private db: PrismaClient,
    private cache: RedisClient,
    private events: EventEmitter
  ) {}
  
  async findById(id: string): Promise<User> {
    // Check cache first
    const cached = await this.cache.get(`user:${id}`);
    if (cached) return JSON.parse(cached);
    
    // Database query
    const user = await this.db.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundError('User not found');
    
    // Cache for 5 minutes
    await this.cache.setex(`user:${id}`, 300, JSON.stringify(user));
    
    return user;
  }
}
```

### Error Handling Pattern
- Use custom error classes
- Include error codes for client handling
- Log with context (userId, requestId)
- Never expose internal errors to clients

## Learning Notes
- Fastify's schema validation is faster than manual validation
- Prisma's `findUnique` is faster than `findFirst` with unique fields
- Consider PostgreSQL's JSONB for flexible product attributes

## Useful Resources
- [Fastify Best Practices](https://www.fastify.io/docs/latest/Guides/Best-Practices/)
- [PostgreSQL Indexing](https://www.postgresql.org/docs/current/indexes.html)
- [JWT Security Best Practices](https://tools.ietf.org/html/rfc8725)

## Next Architecture Reviews
1. Payment processing flow (Stripe integration)
2. File upload strategy (S3 vs local)
3. Email queue implementation
4. Search infrastructure (PostgreSQL FTS vs Elasticsearch)
