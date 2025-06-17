# Backend Auth Agent Context (@backend-auth-todo)

## Current Focus
Implementing advanced authentication features for the TODO application backend:
- Email verification system with token generation ✅
- Password reset flow with secure tokens ✅
- Two-factor authentication (2FA) with TOTP ✅
- OAuth integration (Google, GitHub) ✅
- Session management with Redis ✅
- Account lockout after failed attempts ✅
- CSRF protection ✅
- Request signing for sensitive operations ✅
- API key authentication for external integrations ✅
- Audit logging for security events ✅
- Role-based access control (RBAC) ✅
- Permission system for sharing TODOs ✅
- API rate limiting per user tier ✅

## Technical Decisions
- Using Fastify JWT for token management
- Prisma for database operations
- Redis for session management via ioredis
- bcrypt for password hashing
- speakeasy for TOTP 2FA
- nodemailer for email sending
- axios for OAuth provider communication

## Completed Implementation

### 1. Database Schema Updates
- Fixed schema inconsistencies (password → passwordHash)
- Added Session model replacing RefreshToken
- Added OAuthAccount model for social logins
- Added ApiKey model for API authentication
- Added AuditLog model for security events
- Added Role and UserRole models for RBAC
- Added TodoShare model for permission system
- Created migration file for all changes

### 2. Services Created
- **AdvancedAuthService**: Complete auth flow with email verification, 2FA, password reset, account lockout
- **EmailService**: Sends verification, reset, 2FA, and security alert emails
- **OAuthService**: Handles Google and GitHub OAuth flows
- **SessionService**: Redis-based session management with statistics

### 3. Middleware Created
- **authenticate**: JWT and API key authentication with role/permission extraction
- **requireRoles/requirePermissions**: Authorization checks
- **requireVerifiedEmail**: Email verification enforcement
- **rateLimitByTier**: Dynamic rate limiting based on user roles
- **csrfProtection**: CSRF token validation
- **requireRequestSignature**: Request signing for sensitive operations
- **auditLogging**: Automatic audit trail creation

### 4. Utilities Created
- **tokens.ts**: Secure token generation, TOTP handling, API key generation

### 5. Advanced Routes Created
- Complete auth flow with all advanced features
- OAuth integration endpoints
- 2FA management endpoints
- API key management
- Session management
- Audit log viewing

## Architecture Highlights

### Security Features
1. **Multi-layered Authentication**:
   - Password + 2FA
   - OAuth providers
   - API keys with scopes
   
2. **Account Protection**:
   - Login attempt tracking
   - Account lockout after 5 failed attempts
   - Suspicious activity emails
   
3. **Session Security**:
   - Redis-based sessions
   - Session tracking per user
   - Ability to terminate sessions remotely
   
4. **Request Security**:
   - CSRF protection with double-submit cookies
   - Request signing for sensitive operations
   - Webhook signature verification

### RBAC Implementation
- Roles with granular permissions
- Default roles: user, admin
- Permission format: resource:action (e.g., todo:create, user:*)
- Middleware for role/permission checking

## Integration Points

### Environment Variables Needed
```env
# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Frontend Integration
1. Auth endpoints now return CSRF tokens
2. 2FA flow requires two-step process
3. OAuth redirects to frontend callback URLs
4. Email verification/reset links point to frontend

## Next Steps for Other Agents

### Frontend Agent
1. Implement email verification flow UI
2. Add 2FA setup/verification screens
3. Create OAuth callback handlers
4. Add session management UI
5. Implement CSRF token handling

### DevOps Agent
1. Set up Redis for production
2. Configure OAuth app credentials
3. Set up email service (SMTP/SendGrid)
4. Configure CORS for production domains

### Testing Agent
1. Test email verification flow
2. Test 2FA with valid/invalid codes
3. Test OAuth flows
4. Test account lockout behavior
5. Test API key authentication
6. Load test rate limiting

## Questions/Blockers
- None - all advanced auth features implemented!