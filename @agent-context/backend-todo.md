# @backend-todo - Backend Agent Context

## Current Focus
- Building a fancy TODO app backend with Fastify and TypeScript
- Implemented core functionality, working on advanced features

## Active Decisions

### 2025-01-17 - TODO App Schema Design
Successfully designed and implemented comprehensive schema:
- User authentication with JWT (access + refresh tokens)
- TODO items with priorities, statuses, due dates, reminders
- Categories for organization (with colors and icons)
- Tags for flexible labeling (auto-generated colors)
- Activity tracking for audit trail
- Support for attachments, comments, and sharing

### 2025-06-17 - API Implementation Progress
Completed:
- ✅ Authentication API (register, login, logout, refresh, me)
- ✅ TODO CRUD operations with validation
- ✅ Categories management
- ✅ Tags retrieval and popular tags
- ✅ Search and filtering (built into TODO list endpoint)
- ✅ Rate limiting and security middleware

Still to implement:
- Export functionality (PDF/CSV generation)
- WebSocket for real-time updates
- Comprehensive tests (90%+ coverage)
- Backend README with setup instructions

## Architecture Patterns

### Service Layer Pattern
All business logic encapsulated in service classes:
- AuthService: Handles authentication and sessions
- TodoService: Manages TODO CRUD and business rules
- CategoryService: Handles category management
- TagService: Manages tag operations

### Error Handling
- Custom error classes (AppError, ValidationError, etc.)
- Consistent error response format
- Proper HTTP status codes
- Detailed error logging

### Security Implementation
- JWT with separate access/refresh tokens
- Bcrypt for password hashing
- Rate limiting on all endpoints
- CORS configuration
- Helmet for security headers
- Input validation with Zod schemas

## Technical Notes
- Using UUID for all IDs
- Soft deletes for TODOs (deletedAt field)
- Position field for drag-and-drop reordering
- Tags use connectOrCreate pattern
- Activity logging for all major operations
- Prisma transactions for atomic operations

## API Design Decisions
1. **Pagination**: Standard page/limit with metadata
2. **Filtering**: Query parameters for all major fields
3. **Sorting**: Flexible sortBy and sortOrder
4. **Response Format**: Consistent success/error structure
5. **Date Handling**: ISO 8601 strings in requests/responses

## Performance Optimizations
- Database indexes on frequently queried fields
- Efficient queries with proper includes
- Prisma query optimization
- Request/response time tracking

## Next Steps
1. Implement PDF/CSV export functionality
2. Set up WebSocket server for real-time updates
3. Write comprehensive test suite
4. Create detailed backend README
5. Consider implementing:
   - Email notifications
   - File attachments upload
   - Todo templates
   - Bulk operations