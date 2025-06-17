# Deployment Guide - TODO App

This guide covers the deployment process for the TODO application, including backend deployment to Render.com and frontend deployment to Vercel.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Backend Deployment (Render)](#backend-deployment-render)
4. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
5. [Database Setup](#database-setup)
6. [Environment Variables](#environment-variables)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Monitoring Setup](#monitoring-setup)
9. [Backup Strategy](#backup-strategy)
10. [Troubleshooting](#troubleshooting)
11. [Rollback Procedures](#rollback-procedures)

## Prerequisites

Before deploying, ensure you have:

- GitHub repository with the code
- Render.com account (free tier is sufficient)
- Vercel account (free tier is sufficient)
- Sentry account for error tracking (optional, free tier available)
- Domain name (optional)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │
│     Vercel      │────▶│    Render.com   │
│   (Frontend)    │     │    (Backend)    │
│                 │     │                 │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │                 │
                        │   PostgreSQL    │
                        │   (Render DB)   │
                        │                 │
                        └─────────────────┘
```

- **Frontend**: React app hosted on Vercel
- **Backend**: Node.js API hosted on Render
- **Database**: PostgreSQL managed by Render
- **Cache**: Redis (optional, on Render)
- **File Storage**: Local or S3-compatible storage

## Backend Deployment (Render)

### 1. Initial Setup

1. Create a Render account at https://render.com
2. Connect your GitHub account
3. Create a new Web Service

### 2. Configure the Service

1. **Name**: `todo-backend`
2. **Environment**: `Node`
3. **Build Command**: 
   ```bash
   cd backend && npm ci && npx prisma generate && npm run build
   ```
4. **Start Command**:
   ```bash
   cd backend && npx prisma migrate deploy && npm run start:prod
   ```
5. **Plan**: Free (or upgrade as needed)
6. **Health Check Path**: `/health`

### 3. Environment Variables

Add these environment variables in Render dashboard:

```bash
NODE_ENV=production
PORT=8000
DATABASE_URL=<auto-provided-by-render>
JWT_SECRET=<generate-strong-secret>
JWT_REFRESH_SECRET=<generate-strong-secret>
CORS_ORIGIN=https://your-app.vercel.app
SENTRY_DSN=<your-sentry-dsn>
```

### 4. Database Setup

1. In Render dashboard, create a new PostgreSQL database
2. Connect it to your web service
3. The `DATABASE_URL` will be automatically provided

### 5. Deploy

1. Click "Create Web Service"
2. Wait for the build and deployment to complete
3. Check the logs for any errors
4. Visit the provided URL to verify deployment

## Frontend Deployment (Vercel)

### 1. Initial Setup

1. Create a Vercel account at https://vercel.com
2. Install Vercel CLI (optional):
   ```bash
   npm i -g vercel
   ```

### 2. Deploy via Vercel Dashboard

1. Click "New Project"
2. Import your GitHub repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3. Environment Variables

Add these in Vercel project settings:

```bash
VITE_API_URL=https://todo-backend.onrender.com
VITE_SENTRY_DSN=<your-sentry-dsn>
VITE_APP_NAME=TODO App
```

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Visit the provided URL

### 5. Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Database Setup

### Initial Migration

The database migrations run automatically on deploy via the start command.

### Manual Migration (if needed)

```bash
# Connect to Render dashboard
# Run in Shell tab:
cd backend
npx prisma migrate deploy
```

### Seeding (Optional)

```bash
# For initial data:
cd backend
npm run seed
```

## Environment Variables

### Backend (.env.production)

```bash
# Server
NODE_ENV=production
PORT=8000

# Database (auto-provided by Render)
DATABASE_URL=postgresql://...

# Security
JWT_SECRET=<32+ character random string>
JWT_REFRESH_SECRET=<32+ character random string>
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-app.vercel.app

# Redis (optional)
REDIS_URL=redis://...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...

# Email (optional)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=<sendgrid-api-key>
```

### Frontend (.env.production)

```bash
# API
VITE_API_URL=https://todo-backend.onrender.com

# App Info
VITE_APP_NAME=TODO App
VITE_APP_VERSION=1.0.0

# Monitoring
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_SENTRY_ENVIRONMENT=production

# Analytics (optional)
VITE_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

## CI/CD Pipeline

### GitHub Actions Setup

The repository includes automated workflows:

1. **CI Pipeline** (`ci.yml`): Runs on every push
   - Linting and type checking
   - Unit and integration tests
   - Security scanning
   - Docker build verification

2. **Deploy to Render** (`deploy-render.yml`): Deploys backend
   - Triggered on push to main
   - Runs tests before deployment
   - Health check after deployment

3. **Deploy to Vercel** (`deploy-vercel.yml`): Deploys frontend
   - Triggered on push to main
   - Builds and tests before deployment
   - Vercel handles the actual deployment

4. **Database Backup** (`backup-database.yml`): Daily backups
   - Runs at 2 AM UTC daily
   - Uploads to S3/GCS if configured
   - Retains backups for 7 days

### Required GitHub Secrets

Add these in repository settings:

```yaml
# Render
RENDER_API_KEY: <from-render-account-settings>
RENDER_SERVICE_ID: <from-render-service-dashboard>
RENDER_BACKEND_URL: https://todo-backend.onrender.com

# Vercel
VERCEL_TOKEN: <from-vercel-account-settings>
VERCEL_ORG_ID: <from-vercel-project-settings>
VERCEL_PROJECT_ID: <from-vercel-project-settings>

# Database
DATABASE_URL: <render-database-url>

# Monitoring
SENTRY_DSN_BACKEND: <backend-sentry-dsn>
SENTRY_DSN_FRONTEND: <frontend-sentry-dsn>

# Notifications (optional)
SLACK_WEBHOOK_URL: <slack-incoming-webhook>
NOTIFICATION_EMAIL: ops@yourcompany.com

# Backup Storage (optional)
AWS_ACCESS_KEY_ID: <aws-credentials>
AWS_SECRET_ACCESS_KEY: <aws-credentials>
AWS_S3_BUCKET: <backup-bucket-name>
```

## Monitoring Setup

### 1. Sentry Error Tracking

1. Create a Sentry account at https://sentry.io
2. Create two projects: `todo-backend` and `todo-frontend`
3. Copy the DSN values to environment variables
4. Errors will be automatically tracked

### 2. Render Metrics

- CPU and Memory usage visible in Render dashboard
- Set up alerts for high usage

### 3. Uptime Monitoring

Free options:
- UptimeRobot: https://uptimerobot.com
- Pingdom: https://www.pingdom.com (free tier)
- Better Uptime: https://betteruptime.com

Configure monitors for:
- Backend health endpoint: `https://todo-backend.onrender.com/health`
- Frontend: `https://your-app.vercel.app`

### 4. Application Logs

- **Backend logs**: Available in Render dashboard
- **Frontend logs**: Client-side errors sent to Sentry
- **Structured logging**: JSON format for easy parsing

## Backup Strategy

### Automated Backups

1. **Daily backups** via GitHub Actions
2. **Retention**: 7 days local, 30 days cloud storage
3. **Storage**: S3, GCS, or Backblaze B2

### Manual Backup

```bash
# Local backup
./scripts/backup-database.sh

# Production backup (requires DATABASE_URL)
DATABASE_URL=<render-db-url> ./scripts/backup-database.sh production
```

### Restore Procedure

```bash
# 1. Download backup
aws s3 cp s3://bucket/backup.sql.gz .

# 2. Decompress
gunzip backup.sql.gz

# 3. Restore (CAUTION: This will replace all data)
psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Common Issues

#### Backend Won't Start

1. Check Render logs for errors
2. Verify environment variables are set
3. Ensure database migrations ran successfully
4. Check if port 8000 is being used

#### Frontend Build Fails

1. Check Vercel build logs
2. Verify all dependencies are in package.json
3. Ensure environment variables are set
4. Check for TypeScript errors

#### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check if database is running (Render dashboard)
3. Ensure SSL is enabled for production
4. Check connection pool settings

#### CORS Errors

1. Verify CORS_ORIGIN matches frontend URL exactly
2. Include protocol (https://)
3. No trailing slash
4. Check if credentials are included in requests

### Debug Mode

Enable verbose logging:

```bash
# Backend
LOG_LEVEL=debug

# Frontend
VITE_DEBUG=true
```

## Rollback Procedures

### Backend Rollback

1. In Render dashboard, go to "Deploys"
2. Find the last working deployment
3. Click "Rollback to this deploy"
4. Verify health check passes

### Frontend Rollback

1. In Vercel dashboard, go to "Deployments"
2. Find the last working deployment
3. Click "..." → "Promote to Production"
4. Verify the app loads correctly

### Database Rollback

```bash
# 1. Create backup of current state
pg_dump $DATABASE_URL > current_state.sql

# 2. Restore from previous backup
psql $DATABASE_URL < previous_backup.sql

# 3. Run any necessary migrations
cd backend && npx prisma migrate deploy
```

## Performance Optimization

### Backend

1. Enable Redis caching (Render Redis addon)
2. Use database indexes (check slow query log)
3. Enable compression middleware
4. Implement rate limiting

### Frontend

1. Enable Vercel Edge caching
2. Use dynamic imports for code splitting
3. Optimize images with Next/Image or Vite plugins
4. Enable PWA for offline support

## Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention (React handles this)
- [ ] Dependencies regularly updated
- [ ] Security headers configured
- [ ] Backup encryption enabled

## Scaling Considerations

### When to Upgrade

- **Backend**: >1000 requests/minute or >256MB RAM usage
- **Database**: >1GB data or >100 connections
- **Frontend**: >100GB bandwidth/month

### Upgrade Path

1. **Render**: Upgrade to Starter ($7/month) or Standard
2. **Vercel**: Pro plan for commercial use
3. **Database**: Render managed PostgreSQL scales automatically
4. **Redis**: Add Redis for session management and caching

## Support and Maintenance

### Regular Tasks

- **Weekly**: Check error rates in Sentry
- **Monthly**: Review performance metrics
- **Quarterly**: Update dependencies
- **Yearly**: Review and rotate secrets

### Getting Help

- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Community**: GitHub Discussions
- **Urgent**: Check service status pages

---

Last updated: 2025-01-17