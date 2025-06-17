# Troubleshooting Guide - TODO App

This guide helps diagnose and fix common issues with the TODO application in development and production.

## Table of Contents

1. [Development Issues](#development-issues)
2. [Build Errors](#build-errors)
3. [Runtime Errors](#runtime-errors)
4. [Database Issues](#database-issues)
5. [Authentication Problems](#authentication-problems)
6. [Deployment Issues](#deployment-issues)
7. [Performance Problems](#performance-problems)
8. [Error Messages Reference](#error-messages-reference)

## Development Issues

### Docker Won't Start

**Problem**: `docker-compose up` fails

**Solutions**:

1. **Check Docker is running**:
   ```bash
   docker --version
   docker-compose --version
   ```

2. **Clean up and restart**:
   ```bash
   docker-compose down -v
   docker system prune -a
   docker-compose up --build
   ```

3. **Port conflicts**:
   ```bash
   # Check if ports are in use
   lsof -i :3000  # Frontend
   lsof -i :8000  # Backend
   lsof -i :5432  # PostgreSQL
   ```

4. **Memory issues**:
   - Increase Docker memory allocation in Docker Desktop settings
   - Recommended: 4GB minimum

### Node Modules Issues

**Problem**: Dependencies not installing correctly

**Solutions**:

1. **Clean install**:
   ```bash
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   npm run install:all
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

3. **Check Node version**:
   ```bash
   node --version  # Should be v20.x
   ```

## Build Errors

### TypeScript Errors

**Problem**: Type errors during build

**Common fixes**:

1. **Regenerate types**:
   ```bash
   # Backend
   cd backend && npx prisma generate
   
   # Shared types
   npm run typecheck
   ```

2. **Check imports**:
   ```typescript
   // ❌ Wrong
   import { User } from '@/types'
   
   // ✅ Correct
   import { User } from '@shared/types/auth'
   ```

3. **Strict mode issues**:
   ```typescript
   // Handle potential undefined
   const user = users.find(u => u.id === id)
   if (!user) {
     throw new Error('User not found')
   }
   ```

### Build Out of Memory

**Problem**: JavaScript heap out of memory

**Solutions**:

1. **Increase memory**:
   ```bash
   # In package.json scripts
   "build": "NODE_OPTIONS='--max-old-space-size=4096' vite build"
   ```

2. **Build separately**:
   ```bash
   npm run build:backend
   npm run build:frontend
   ```

## Runtime Errors

### CORS Errors

**Problem**: "Access blocked by CORS policy"

**Solutions**:

1. **Check backend CORS config**:
   ```typescript
   // backend/src/app.ts
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
     credentials: true
   }))
   ```

2. **Verify environment variable**:
   ```bash
   # .env
   CORS_ORIGIN=http://localhost:3000  # Development
   CORS_ORIGIN=https://your-app.vercel.app  # Production
   ```

3. **Include credentials in frontend**:
   ```typescript
   // frontend/src/services/api.ts
   fetch(url, {
     credentials: 'include',
     headers: {
       'Content-Type': 'application/json',
     },
   })
   ```

### API Connection Refused

**Problem**: "Failed to fetch" or "Connection refused"

**Solutions**:

1. **Check backend is running**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Verify API URL**:
   ```bash
   # frontend/.env
   VITE_API_URL=http://localhost:8000  # No trailing slash
   ```

3. **Docker networking**:
   ```yaml
   # docker-compose.yml
   services:
     frontend:
       environment:
         - VITE_API_URL=http://backend:8000  # Use service name
   ```

## Database Issues

### Migration Failures

**Problem**: "Migration failed" or schema out of sync

**Solutions**:

1. **Reset database** (development only):
   ```bash
   cd backend
   npx prisma migrate reset
   ```

2. **Manual migration**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```

3. **Check migration status**:
   ```bash
   npx prisma migrate status
   ```

### Connection Pool Exhausted

**Problem**: "Too many connections" error

**Solutions**:

1. **Adjust pool size**:
   ```prisma
   // schema.prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Add connection limit
     connection_limit = 5
   }
   ```

2. **Check for connection leaks**:
   ```typescript
   // Always use try-finally
   try {
     const result = await prisma.user.findMany()
     return result
   } finally {
     await prisma.$disconnect()
   }
   ```

### Slow Queries

**Problem**: Database queries timing out

**Solutions**:

1. **Add indexes**:
   ```prisma
   model User {
     id    String @id
     email String @unique
     
     @@index([email])
   }
   ```

2. **Enable query logging**:
   ```typescript
   const prisma = new PrismaClient({
     log: ['query', 'info', 'warn', 'error'],
   })
   ```

3. **Use query optimization**:
   ```typescript
   // Include relations in single query
   const users = await prisma.user.findMany({
     include: {
       posts: true,
       profile: true,
     },
   })
   ```

## Authentication Problems

### JWT Token Invalid

**Problem**: "Invalid token" or "Token expired"

**Solutions**:

1. **Check token expiry**:
   ```typescript
   // Decode token to check expiry
   const decoded = jwt.decode(token)
   console.log('Expires at:', new Date(decoded.exp * 1000))
   ```

2. **Verify secrets match**:
   ```bash
   # Backend and frontend must use same secret
   JWT_SECRET=same-secret-everywhere
   ```

3. **Clear browser storage**:
   ```javascript
   // In browser console
   localStorage.clear()
   sessionStorage.clear()
   ```

### Refresh Token Not Working

**Problem**: Auto-refresh fails

**Solutions**:

1. **Check cookie settings**:
   ```typescript
   // Backend
   res.cookie('refreshToken', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'lax',
     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
   })
   ```

2. **Verify cookie domain**:
   ```typescript
   // For cross-domain
   res.cookie('refreshToken', token, {
     domain: '.yourdomain.com',
     // ... other options
   })
   ```

## Deployment Issues

### Render Build Failures

**Problem**: Build fails on Render

**Solutions**:

1. **Check build logs** in Render dashboard

2. **Verify build command**:
   ```yaml
   # render.yaml
   buildCommand: cd backend && npm ci && npx prisma generate && npm run build
   ```

3. **Environment variables**:
   - Ensure all required env vars are set
   - No quotes around values in Render dashboard

### Vercel Build Failures

**Problem**: Frontend won't build on Vercel

**Solutions**:

1. **Check build settings**:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Environment variables**:
   ```bash
   # Must start with VITE_
   VITE_API_URL=https://api.example.com
   ```

3. **Node version**:
   ```json
   // frontend/package.json
   "engines": {
     "node": ">=20.0.0"
   }
   ```

### Health Check Failures

**Problem**: Service marked as unhealthy

**Solutions**:

1. **Implement health endpoint**:
   ```typescript
   // backend/src/routes/health.ts
   app.get('/health', async (req, res) => {
     try {
       // Check database
       await prisma.$queryRaw`SELECT 1`
       
       // Check Redis
       await redis.ping()
       
       res.json({ status: 'healthy' })
     } catch (error) {
       res.status(503).json({ status: 'unhealthy', error })
     }
   })
   ```

2. **Increase startup time**:
   - In Render: Settings → Health Check → Start Period

## Performance Problems

### Slow Page Load

**Problem**: Frontend takes too long to load

**Solutions**:

1. **Enable compression**:
   ```typescript
   // vite.config.ts
   import viteCompression from 'vite-plugin-compression'
   
   export default {
     plugins: [
       viteCompression({
         algorithm: 'gzip',
       }),
     ],
   }
   ```

2. **Lazy load routes**:
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'))
   ```

3. **Optimize images**:
   ```typescript
   import imagemin from 'vite-plugin-imagemin'
   ```

### High Memory Usage

**Problem**: Backend consuming too much memory

**Solutions**:

1. **Check for memory leaks**:
   ```typescript
   // Use weak references for caches
   const cache = new WeakMap()
   ```

2. **Limit concurrent operations**:
   ```typescript
   import pLimit from 'p-limit'
   const limit = pLimit(10)
   
   const results = await Promise.all(
     items.map(item => limit(() => processItem(item)))
   )
   ```

3. **Monitor memory**:
   ```typescript
   setInterval(() => {
     const used = process.memoryUsage()
     console.log('Memory:', {
       rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
       heap: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
     })
   }, 60000)
   ```

## Error Messages Reference

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| `ERR_001` | Database connection failed | Check DATABASE_URL and network |
| `ERR_002` | Invalid credentials | Verify username/password |
| `ERR_003` | Token expired | Refresh token or re-login |
| `ERR_004` | Rate limit exceeded | Wait and retry |
| `ERR_005` | Validation failed | Check request payload |
| `ERR_006` | Resource not found | Verify ID/URL exists |
| `ERR_007` | Insufficient permissions | Check user role |
| `ERR_008` | Server error | Check logs and retry |

### Debugging Tools

1. **Backend debugging**:
   ```bash
   # Enable debug logs
   DEBUG=* npm run dev
   
   # Use debugger
   node --inspect=0.0.0.0:9229 dist/index.js
   ```

2. **Frontend debugging**:
   - React DevTools
   - Redux DevTools (if using Redux)
   - Network tab in browser

3. **Database debugging**:
   ```bash
   # Connect to database
   docker-compose exec db psql -U postgres -d app_db
   
   # Show running queries
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

### Getting Help

1. **Check logs**:
   - Backend: `docker-compose logs backend`
   - Frontend: Browser console
   - Database: `docker-compose logs db`

2. **Enable verbose logging**:
   ```bash
   LOG_LEVEL=debug
   ```

3. **Report issues**:
   - Include error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

---

Last updated: 2025-01-17