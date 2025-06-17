# Shared Decisions Log

Decisions that affect multiple agents or the overall architecture.

---

## 2025-01-15 - API Response Format
**Decided by**: @arch-01, @backend-01, @frontend-01
**Decision**: Standardize all API responses using the format in `shared/types/api.ts`
**Rationale**: Consistent error handling and response parsing across the stack
**Impact**: 
- Backend: All endpoints must return ApiResponse<T>
- Frontend: Can use single response parser
- Testing: Simplified response assertions

---

## 2025-01-15 - Authentication Flow
**Decided by**: @arch-01, @fullstack-01
**Decision**: JWT with separate access/refresh tokens
**Rationale**: Balance between security and user experience
**Implementation**:
- Access token: 15 minutes, stored in memory
- Refresh token: 7 days, httpOnly cookie
- Auto-refresh: Frontend interceptor handles token refresh
**Impact**: All agents need to handle 401 responses appropriately

---

## 2025-01-15 - Testing Strategy
**Decided by**: @test-01, @arch-01
**Decision**: No mocking in integration tests
**Rationale**: Too many bugs slipped through mocked tests
**Impact**: 
- Slightly slower test runs
- Need test database for each developer
- More reliable tests

---

## 2025-06-17 - TODO App Architecture
**Decided by**: @arch-todo
**Decision**: 3-tier architecture with React frontend, Fastify backend, PostgreSQL database
**Rationale**: Modern stack, type-safe, great DX, all services available on free tiers
**Impact**: 
- Backend: Use Fastify with Prisma ORM, implement JWT auth first
- Frontend: React with Vite, Tiptap for rich text, Socket.io for real-time
- DevOps: Deploy on Vercel (frontend) and Render.com (backend)
- Testing: Focus on auth, real-time sync, and drag-drop functionality
**Implementation Notes**: See docs/adr/001-todo-app-architecture.md for details

---

## Template for New Decisions

## YYYY-MM-DD - Decision Title
**Decided by**: @agent-1, @agent-2
**Decision**: What was decided
**Rationale**: Why this decision was made
**Impact**: How this affects each agent's work
**Implementation Notes**: Any specific details

## Advanced Authentication Architecture (2025-06-17)
**Agent**: @backend-auth-todo
**Decision**: Implemented comprehensive authentication system

### Key Components:
1. **Multi-factor Authentication**:
   - Password-based with bcrypt
   - TOTP 2FA with speakeasy
   - Backup codes for recovery
   
2. **OAuth Integration**:
   - Google OAuth2
   - GitHub OAuth2
   - Extensible for other providers
   
3. **Session Management**:
   - Redis-based sessions
   - Multi-device support
   - Remote session termination
   
4. **Security Features**:
   - Email verification required
   - Account lockout after failed attempts
   - CSRF protection
   - Request signing for sensitive ops
   - Comprehensive audit logging
   
5. **RBAC System**:
   - Role-based permissions
   - Granular permission model (resource:action)
   - API key authentication with scopes

### Integration Requirements:
- Redis instance for sessions
- SMTP server for emails
- OAuth app credentials
- Frontend must handle CSRF tokens
- Frontend needs 2FA UI flow

**Impact**: All API endpoints can now use advanced auth middleware for protection
EOF < /dev/null
