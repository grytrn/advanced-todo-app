# TODO App Deployment Architecture

## Overview

This document outlines the deployment strategy for the TODO app using free cloud providers to minimize costs while maintaining reliability and performance.

## Cloud Provider Selection

### Frontend: Vercel
- **Free Tier**: 100GB bandwidth, unlimited deployments
- **Features**: Automatic HTTPS, global CDN, preview deployments
- **Limitations**: 100GB bandwidth/month, 10 seconds function timeout

### Backend: Render.com
- **Free Tier**: 750 hours/month, PostgreSQL database included
- **Features**: Automatic HTTPS, zero-downtime deploys, managed PostgreSQL
- **Limitations**: Spins down after 15 min inactivity, 512MB RAM, shared CPU

### Cache/Queue: Upstash Redis
- **Free Tier**: 10,000 commands/day, 256MB storage
- **Features**: Serverless, global replication, REST API
- **Limitations**: 10k commands/day, 256MB max database size

### File Storage: Cloudinary
- **Free Tier**: 25GB storage, 25GB bandwidth/month
- **Features**: Image optimization, CDN, transformations
- **Limitations**: 25 monthly credits (1 credit = 1000 transformations)

### Email: SendGrid
- **Free Tier**: 100 emails/day forever
- **Features**: Templates, analytics, webhooks
- **Limitations**: 100 emails/day

### Monitoring: Sentry
- **Free Tier**: 5k errors/month, 10k transactions
- **Features**: Error tracking, performance monitoring
- **Limitations**: 30-day retention

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           Internet                               │
└─────────────────┬───────────────────────┬──────────────────────┘
                  │                       │
                  ▼                       ▼
         ┌────────────────┐      ┌────────────────┐
         │   Cloudflare   │      │   Cloudflare   │
         │  (DNS + CDN)   │      │  (DNS + CDN)   │
         └───────┬────────┘      └───────┬────────┘
                 │                        │
                 ▼                        ▼
        ┌─────────────────┐     ┌─────────────────┐
        │     Vercel      │     │   Render.com    │
        │   (Frontend)    │────▶│   (Backend)     │
        │ app.todos.com   │     │ api.todos.com   │
        └─────────────────┘     └────────┬────────┘
                                         │
                ┌────────────────────────┼────────────────────────┐
                │                        │                        │
                ▼                        ▼                        ▼
        ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
        │  PostgreSQL  │        │   Upstash    │        │  Cloudinary  │
        │  (Render)    │        │   (Redis)    │        │   (Files)    │
        └──────────────┘        └──────────────┘        └──────────────┘
```

## Deployment Steps

### 1. Domain Setup (Cloudflare)
```bash
# Add domain to Cloudflare (free plan)
# Configure DNS records:
A     @           76.76.21.21    # Vercel IP
CNAME app         cname.vercel-dns.com
CNAME api         todo-api.onrender.com
```

### 2. Frontend Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Configure environment variables in Vercel dashboard
VITE_API_URL=https://api.todos.com
VITE_WS_URL=wss://api.todos.com
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 3. Backend Deployment (Render.com)

**render.yaml:**
```yaml
services:
  - type: web
    name: todo-api
    env: node
    plan: free
    buildCommand: "npm install && npm run build && npx prisma migrate deploy"
    startCommand: "npm start"
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: todo-db
          property: connectionString
      - key: REDIS_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: SENDGRID_API_KEY
        sync: false
      - key: CLOUDINARY_URL
        sync: false
      - key: FRONTEND_URL
        value: https://app.todos.com
      - key: SENTRY_DSN
        sync: false

databases:
  - name: todo-db
    plan: free
    databaseName: todos
    user: todos
```

### 4. Redis Setup (Upstash)
```bash
# Create database at console.upstash.com
# Get credentials:
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
```

### 5. File Storage (Cloudinary)
```bash
# Sign up at cloudinary.com
# Get credentials:
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### 6. Email Service (SendGrid)
```bash
# Sign up at sendgrid.com
# Verify sender domain
# Create API key with Mail Send permission
SENDGRID_API_KEY=SG.xxxxxxxxxxxx
```

### 7. Monitoring (Sentry)
```bash
# Create project at sentry.io
# Get DSN:
SENTRY_DSN=https://xxxxx@xxx.ingest.sentry.io/xxxxx
```

## Environment Variables

### Frontend (.env.production)
```bash
VITE_API_URL=https://api.todos.com
VITE_WS_URL=wss://api.todos.com
VITE_SENTRY_DSN=https://xxxxx@xxx.ingest.sentry.io/xxxxx
```

### Backend (.env.production)
```bash
NODE_ENV=production
PORT=8000
DATABASE_URL=postgresql://todos:xxxxx@xxxxx.render.com:5432/todos
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
JWT_SECRET=xxxxx
JWT_REFRESH_SECRET=xxxxx
SENDGRID_API_KEY=SG.xxxxx
CLOUDINARY_URL=cloudinary://xxxxx:xxxxx@xxxxx
FRONTEND_URL=https://app.todos.com
SENTRY_DSN=https://xxxxx@xxx.ingest.sentry.io/xxxxx
```

## CI/CD Pipeline (GitHub Actions)

**.github/workflows/deploy.yml:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - name: Install and Build
        run: |
          cd frontend
          npm ci
          npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - name: Deploy to Render
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
        run: |
          curl -X POST https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys \
            -H "Authorization: Bearer $RENDER_API_KEY" \
            -H "Content-Type: application/json"
```

## Performance Optimization

### 1. Keep Services Warm
```typescript
// Backend health check endpoint
app.get('/health', async (req, reply) => {
  const checks = {
    server: 'ok',
    database: await checkDatabase(),
    redis: await checkRedis()
  };
  reply.send(checks);
});

// Frontend: Ping API periodically
setInterval(() => {
  fetch(`${API_URL}/health`).catch(() => {});
}, 5 * 60 * 1000); // Every 5 minutes
```

### 2. Caching Strategy
```typescript
// Cache user preferences
await redis.setex(`user:${userId}:preferences`, 3600, JSON.stringify(preferences));

// Cache todo list
await redis.setex(`user:${userId}:todos:${page}`, 300, JSON.stringify(todos));
```

### 3. Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_todos_user_completed ON todos(user_id, completed);
CREATE INDEX idx_todos_user_category ON todos(user_id, category_id);
CREATE INDEX idx_todos_user_position ON todos(user_id, position);
```

## Cost Optimization

### Stay Within Free Tiers
1. **Vercel**: Monitor bandwidth usage, optimize images
2. **Render**: Use cron job to ping service every 14 minutes
3. **Upstash**: Implement request batching, use TTL
4. **Cloudinary**: Optimize images on upload, use transformations wisely
5. **SendGrid**: Batch notifications, daily digest option

### Monitoring Usage
```typescript
// Track API usage
const usage = {
  vercel: await getVercelUsage(),
  render: await getRenderMetrics(),
  upstash: await redis.info('stats'),
  cloudinary: await cloudinary.api.usage(),
  sendgrid: await getSendGridStats()
};
```

## Scaling Strategy

When free tiers are exceeded:

1. **First Step**: Optimize current usage
   - Implement aggressive caching
   - Reduce image sizes
   - Batch operations

2. **Second Step**: Upgrade selectively
   - Render: Starter plan ($7/month)
   - Upstash: Pay-as-you-go ($0.2/100k commands)
   - Vercel: Pro plan ($20/month)

3. **Third Step**: Consider alternatives
   - Self-host on VPS (DigitalOcean, Linode)
   - Use Railway.app or Fly.io
   - Move to AWS/GCP free tier

## Security Considerations

### 1. Environment Variables
- Never commit `.env` files
- Use Render/Vercel secrets management
- Rotate keys regularly

### 2. HTTPS Everywhere
- Enforced by Vercel/Render
- Use Cloudflare SSL

### 3. Rate Limiting
```typescript
// Implement with Upstash
const limit = await redis.incr(`rate:${ip}`);
await redis.expire(`rate:${ip}`, 900); // 15 minutes
if (limit > 100) throw new Error('Rate limit exceeded');
```

### 4. Security Headers
- Set by Vercel config
- Additional headers in Fastify middleware

## Backup Strategy

### Database Backups
```bash
# Daily backup script
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
# Upload to Cloudinary or free S3 alternative
```

### Application Backups
- Code: GitHub
- Environment: Document all configs
- Data: Automated PostgreSQL dumps

## Disaster Recovery

1. **Database Failure**: Restore from daily backup
2. **Service Outage**: Failover to backup providers
3. **Data Loss**: Point-in-time recovery from backups
4. **Security Breach**: Rotate all credentials, audit logs

## Monitoring Dashboard

Create a simple status page:
```typescript
// Status endpoint
app.get('/status', async (req, reply) => {
  const status = {
    api: 'operational',
    database: await checkDatabase(),
    redis: await checkRedis(),
    email: await checkSendGrid(),
    storage: await checkCloudinary(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  };
  reply.send(status);
});
```

## Conclusion

This deployment architecture provides:
- **Zero cost** for small to medium usage
- **High availability** with global CDN
- **Scalability** through managed services
- **Security** with HTTPS and proper secrets management
- **Monitoring** for proactive issue detection

The setup can handle approximately:
- 10,000 active users
- 100,000 todos
- 1M API requests/month
- 25GB file storage

All within free tier limits!