# CLAUDE.md - Multi-Agent Development Guidelines

## CRITICAL: Re-read Instructions
You MUST re-read the relevant files:
- **CLAUDE.md**: When starting work, after errors, or switching tasks
- **TODO.md**: Current work assignments and blockers
- **Import files**: Check `@project-context`, `@tech-stack`, `@current-work` etc.

Re-read triggers:
- Starting a new work session
- After any error message
- Before making commits
- When switching between tasks
- If confused about project state

## Agent Context System

### Your Personal Working Memory
Each agent has a personal context file in `@agent-context/{agent-name}.md` that serves as persistent memory between sessions. This is CRITICAL for AI agents like Claude.

**Start every session by:**
```bash
# 1. Read your context file
cat @agent-context/{your-name}.md

# 2. Check shared decisions
cat @agent-context/shared-decisions.md

# 3. Update your current focus
```

**Update your context file when:**
- Making technical decisions
- Discovering useful patterns
- Having questions for other agents
- Before ending your work session
- Finding gotchas or issues

**Quick update:** `npm run agent:context` (interactive menu)

See `@agent-context/README.md` for detailed usage instructions.

## Import System for Multi-Agent Coordination

### Active Imports
The following import files are used for agent coordination:
- `@project-context` - Project overview and current sprint
- `@tech-stack` - Technology decisions and versions
- `@current-work` - Active tasks and assignments
- `@agent-roles` - Agent specializations
- `@api-contracts` - API endpoint definitions
- `@conventions` - Project-specific conventions
- `@blockers` - Current blockers and dependencies
- `@assignments.lock` - File ownership and locking
- `@performance-baseline.json` - Performance metrics targets
- `@agent-context/` - Agent memory and shared decisions
- `@agent-metrics.md` - Agent productivity dashboard (generated)

### Updating Imports
```bash
# When making decisions
echo "[2025-01-15] Backend: Chose Fastify for performance" >> @tech-stack

# When updating work status  
echo "@backend-01: ✅ Auth API complete" >> @current-work
echo "@frontend-01: ⏳ Starting auth UI" >> @current-work

# When blocked
echo "@frontend-01: ❌ Blocked on auth endpoints - waiting for @backend-01" >> @blockers
```

## Project Structure
```
/
├── backend/               # Backend API service
│   ├── src/              
│   │   ├── api/          # Routes and controllers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── middleware/   # Express/Fastify middleware
│   │   ├── utils/        # Utilities
│   │   └── config/       # Configuration
│   ├── tests/            
│   │   ├── unit/         # Unit tests
│   │   └── integration/  # Integration tests
│   ├── migrations/       # Database migrations
│   ├── seeds/            # Database seeds
│   ├── package.json      # Backend dependencies
│   ├── tsconfig.json     # Backend TypeScript config
│   └── .env.example      # Backend environment template
├── frontend/             # Frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API client
│   │   ├── store/        # State management
│   │   ├── utils/        # Utilities
│   │   └── styles/       # Global styles
│   ├── public/           # Static assets
│   ├── tests/
│   │   ├── unit/         # Unit tests
│   │   └── integration/  # Integration tests
│   ├── package.json      # Frontend dependencies
│   ├── tsconfig.json     # Frontend TypeScript config
│   └── .env.example      # Frontend environment template
├── shared/               # Shared code
│   ├── types/            # TypeScript interfaces
│   ├── constants/        # Shared constants
│   └── utils/            # Shared utilities
├── tests/                # Full-stack tests
│   ├── integration/      # Cross-service integration tests
│   └── e2e/             # End-to-end tests
├── docs/                # Documentation
│   ├── adr/             # Architecture Decision Records
│   ├── api/             # API documentation
│   └── guides/          # Development guides
├── reports/             # Agent coordination
│   ├── agent-tasks/     # Task completion reports
│   ├── handoffs/        # Agent handoff records
│   └── decisions/       # Decision records
├── scripts/             # Utility scripts
├── docker/              # Docker configurations
│   ├── backend/         # Backend Dockerfile
│   └── frontend/        # Frontend Dockerfile
├── nginx/               # Nginx configuration
│   └── conf.d/          # Site configurations
├── .github/             # GitHub Actions
│   └── workflows/       # CI/CD pipelines
├── package.json         # Root orchestration scripts
├── docker-compose.yml   # Local development
├── TODO.md             # Current work tracking
└── CLAUDE.md           # This file
```

## Development Commands

### Agent-Specific Commands
```bash
# Agent coordination tools
npm run agent:metrics       # Generate metrics dashboard
npm run agent:context       # Update your agent context (interactive menu)
npm run agent:status        # Show recent work status  
npm run agent:blockers      # List active blockers
npm run agent:handoffs      # Show handoff records
npm run agent:setup-hooks   # Install git hooks (first time setup)
npm run agent:validate-locks # Validate file assignments
```

### Root Level Commands (Orchestration)
```bash
# Install all dependencies
npm run install:all

# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Testing
npm run test             # Run all tests
npm run test:backend     # Test backend only
npm run test:frontend    # Test frontend only
npm run test:e2e         # Run E2E tests

# Code Quality
npm run lint             # Lint all code
npm run lint:backend     # Lint backend only
npm run lint:frontend    # Lint frontend only
npm run typecheck        # Type check all
npm run typecheck:backend
npm run typecheck:frontend

# Build
npm run build            # Build all services
npm run build:backend    
npm run build:frontend   

# Docker
npm run docker:build     # Build all images
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
```

### Service-Specific Commands
```bash
# Backend (from /backend)
npm run dev              # Start development server
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run migrate          # Run migrations
npm run seed             # Seed database

# Frontend (from /frontend)
npm run dev              # Start dev server
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run build            # Production build
npm run preview          # Preview production build
```

## Agent Roles and Responsibilities

### 1. Architect Agent (@arch)
- **Owns**: System design, technology decisions
- **Maintains**: `@tech-stack`, ADRs
- **Reviews**: All architectural changes

### 2. Backend Agent (@backend)
- **Owns**: API development, database, business logic
- **Maintains**: `/backend`, API documentation
- **Updates**: `@api-contracts` when creating endpoints

### 3. Frontend Agent (@frontend)
- **Owns**: UI/UX, client-side logic, styling
- **Maintains**: `/frontend`, component library
- **Consumes**: `@api-contracts` for integration

### 4. Full-Stack Agent (@fullstack)
- **Owns**: End-to-end features
- **Maintains**: Both frontend and backend for features
- **Coordinates**: Cross-stack changes

### 5. Testing Agent (@test)
- **Owns**: Test strategy, E2E tests
- **Maintains**: `/tests`, coverage reports
- **Reviews**: All test implementations

### 6. DevOps Agent (@devops)
- **Owns**: CI/CD, deployment, monitoring
- **Maintains**: Docker configs, GitHub Actions
- **Updates**: Deployment documentation

## Git Workflow

### Branch Naming
```
feature/backend-[description]    # Backend features
feature/frontend-[description]   # Frontend features
feature/fullstack-[description]  # Cross-stack features
fix/[issue-description]         # Bug fixes
chore/[description]             # Maintenance
experiment/[description]        # Experiments
```

### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore, perf

**Example with handoff**:
```
feat(backend/auth): implement JWT refresh endpoint

- Add POST /api/v1/auth/refresh
- Implement token rotation
- Add rate limiting
- 100% test coverage

Handoff: Frontend needs to implement auto-refresh
Docs: Updated @api-contracts and API.md
Next: @frontend - implement token interceptor
```

## Multi-Agent Coordination

### Enhanced Coordination Features

#### Automatic Status Updates
Git hooks now automatically update @current-work based on commit messages:
- Use `[WIP]` for work in progress
- Use `[COMPLETE]` when finishing a task
- Use `[BLOCKED]` when stuck
- Include `Handoff: @next-agent` to trigger handoff automation

#### File Ownership Locking
Check `@assignments.lock` before modifying files:
```json
{
  "backend/src/auth/*": {
    "agent": "@backend-01",
    "locked_until": "2025-01-16T00:00:00Z"
  }
}
```

#### Agent Memory
Maintain context in `@agent-context/your-name.md`:
- Document decisions and rationale
- Save useful code snippets
- Note questions for other agents
- Track work-in-progress thoughts

#### Performance Tracking
- Check `@performance-baseline.json` for targets
- Run `npm run agent:metrics` weekly
- Monitor your productivity trends

### Starting Work
```bash
# 1. Check your assignment
cat TODO.md
cat @current-work | grep "@your-name"

# 2. Check for blockers
cat @blockers

# 3. Pull latest
git pull origin main

# 4. Create feature branch
git checkout -b feature/backend-auth

# 5. Update status
echo "@backend-01: ⏳ Working on auth API | feature/backend-auth" >> @current-work
```

### During Development
```bash
# Regular commits with clear messages
git add .
git commit -m "feat(backend): add user validation

Implements Zod schemas for user input validation"

# Update imports when making decisions
echo "[2025-01-15] Auth: JWT with 15min access tokens" >> @tech-stack
```

### Completing Work
```bash
# 1. Run all checks
npm run lint:backend
npm run typecheck:backend  
npm run test:backend

# 2. Update status
echo "@backend-01: ✅ Auth API complete" >> @current-work
echo "@frontend-01: Ready to implement auth UI" >> @current-work

# 3. Update TODO.md
# Mark your task complete, unblock others

# 4. Create PR with handoff information
```

### Smart Handoff Automation 🚀

Handoffs are now automated! When you include `Handoff: @next-agent` in commits or PRs:
- GitHub issue created automatically
- @current-work updated
- Notifications sent (if configured)
- Blockers resolved

**Quick handoff:**
```bash
npm run handoff @frontend-01 "Auth API complete, ready for UI"
```

See `docs/agent-handoff-system.md` for full details.

### Handling Blockers
```bash
# When blocked
echo "@frontend-01: ❌ Blocked on user API - need endpoints from @backend-01" >> @blockers

# When unblocking
echo "@frontend-01: ✅ Unblocked - user API available" >> @blockers
# Also update @current-work
```

## Code Quality Standards

### TypeScript Configuration
Both frontend and backend use strict TypeScript:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Forbidden Practices ❌
**NEVER**:
- Use `any` type in TypeScript
- Commit without running tests
- Leave `console.log` in code
- Mock integration or E2E tests
- Hardcode secrets or API keys
- Disable linting rules
- Skip error handling
- Commit directly to main

### Required Practices ✅
**ALWAYS**:
- Write tests for new code
- Update documentation immediately
- Handle all errors explicitly
- Use proper TypeScript types
- Follow RESTful conventions
- Validate all inputs
- Use semantic commit messages
- Update relevant imports

## Testing Standards

### Coverage Requirements
- **Minimum**: 80% overall
- **Critical paths**: 100% (auth, payments, data validation)

### Test Types
1. **Unit Tests** (in service directories)
   - Test individual functions
   - Mock external dependencies
   - Fast execution (<10ms)

2. **Integration Tests** (in service directories)
   - Test API endpoints
   - Test service interactions
   - Real database (test DB)
   - NO mocking of external services

3. **E2E Tests** (in /tests/e2e)
   - Test complete user journeys
   - Real services, no mocks
   - Browser automation

## API Development

### API Structure
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/users          # List (paginated)
GET    /api/v1/users/:id      # Get one
POST   /api/v1/users          # Create
PATCH  /api/v1/users/:id      # Update
DELETE /api/v1/users/:id      # Delete
```

### Response Format
```typescript
// Success
{
  "success": true,
  "data": T,
  "metadata": {
    "page": 1,
    "total": 100,
    "timestamp": "2025-01-15T10:00:00Z"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  }
}
```

### Shared Types
Define all API types in `/shared/types/`:
```typescript
// shared/types/auth.ts
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

## Security Requirements

### Every PR Must Ensure
- [ ] No hardcoded secrets (use env vars)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection enabled
- [ ] Rate limiting implemented
- [ ] Auth required for protected routes
- [ ] Proper error messages (no stack traces)

### Environment Variables
```bash
# Backend (.env)
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=...

# Frontend (.env)
VITE_API_URL=http://localhost:8000
VITE_PUBLIC_URL=http://localhost:3000
```

## Deployment

### Local Development
```bash
# Start everything
docker-compose up -d

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# Database: localhost:5432
# Redis: localhost:6379
```

### Production Deployment
1. CI runs on push to main
2. Tests must pass
3. Security scan must pass
4. Auto-deploy to staging
5. Manual approval for production

## Review Checklist

Before marking ANY task complete:
- [ ] All tests pass
- [ ] Lint passes (zero warnings)
- [ ] TypeScript compiles
- [ ] Coverage >= 80%
- [ ] Documentation updated
- [ ] Imports updated
- [ ] TODO.md updated
- [ ] No console.logs
- [ ] Error handling complete
- [ ] Security checklist done

## Emergency Procedures

### If You Break Main
```bash
# 1. Immediately revert
git revert HEAD
git push origin main

# 2. Fix in feature branch
git checkout -b fix/emergency-fix

# 3. Update @current-work
echo "@your-name: 🚨 Fixing main branch issue" >> @current-work
```

### If Tests Fail in CI
1. Do NOT merge
2. Fix in your branch
3. Re-run all checks locally
4. Push only when green

## Final Reminders

1. **Read First** - Always read before editing
2. **Test Everything** - No exceptions
3. **Document Immediately** - Same commit
4. **Use Imports** - Keep them updated
5. **Communicate** - Update work status
6. **Quality Matters** - Better done right
7. **Ask Questions** - Check @blockers if stuck
