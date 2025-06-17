# 🚀 TODO App Deployment Guide

This guide will walk you through deploying the TODO application to production using Vercel (frontend) and Render.com (backend).

## Prerequisites

- GitHub account with the repository
- Vercel account (free tier works)
- Render.com account (free tier works)
- SendGrid or similar email service account (optional)
- Sentry account for error tracking (optional)

## Backend Deployment (Render.com)

### 1. Create PostgreSQL Database

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "PostgreSQL"
3. Configure:
   - **Name**: `todo-app-db`
   - **Database**: `todo_db`
   - **User**: `todo_user`
   - **Region**: Choose closest to your users
   - **Plan**: Free (or upgrade as needed)
4. Click "Create Database"
5. Wait for database to be ready
6. Copy the **Internal Database URL** for later

### 2. Create Redis Instance

1. Click "New +" → "Redis"
2. Configure:
   - **Name**: `todo-app-redis`
   - **Region**: Same as database
   - **Plan**: Free
3. Click "Create Redis"
4. Copy the **Internal Redis URL** for later

### 3. Deploy Backend Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `todo-api`
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free
4. Add Environment Variables:

```env
# From .env.production template
NODE_ENV=production
PORT=8000
API_VERSION=v1
FRONTEND_URL=https://your-app.vercel.app

# Database (use Internal URL from step 1)
DATABASE_URL=postgresql://todo_user:password@dpg-xxx.internal:5432/todo_db

# Redis (use Internal URL from step 2)
REDIS_URL=redis://red-xxx.internal:6379
REDIS_TTL=900

# Authentication (generate secure secrets)
JWT_SECRET=generate-a-secure-32-char-secret-here
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=generate-another-secure-32-char-secret
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Email (configure with your provider)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Todo App

# CORS
CORS_ORIGIN=https://your-app.vercel.app
CORS_CREDENTIALS=true

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
```

5. Click "Create Web Service"
6. Wait for deployment to complete
7. Copy the service URL (e.g., `https://todo-api.onrender.com`)

### 4. Set up Custom Domain (Optional)

1. Go to your service settings
2. Add custom domain
3. Update DNS records as instructed

## Frontend Deployment (Vercel)

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Import Project"
3. Import from GitHub
4. Select your repository

### 2. Configure Build Settings

1. **Framework Preset**: Vite
2. **Root Directory**: `frontend`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### 3. Environment Variables

Add these environment variables:

```env
VITE_API_URL=https://todo-api.onrender.com
VITE_WEBSOCKET_URL=wss://todo-api.onrender.com
VITE_APP_NAME=Todo App Advanced
VITE_APP_VERSION=1.0.0
VITE_ENABLE_OAUTH=true
VITE_ENABLE_2FA=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_PUSH_NOTIFICATIONS=true
VITE_SENTRY_DSN=your-frontend-sentry-dsn
```

### 4. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Your app will be available at `https://your-project.vercel.app`

### 5. Set up Custom Domain (Optional)

1. Go to project settings
2. Add custom domain
3. Update DNS records

## Post-Deployment Steps

### 1. Update Backend CORS

Go back to Render.com and update the backend environment variables:
- `FRONTEND_URL`: Your Vercel URL
- `CORS_ORIGIN`: Your Vercel URL
- `APP_URL`: Your Render backend URL

### 2. Test Everything

1. **Registration Flow**
   - Register new account
   - Check email verification
   - Login

2. **Core Features**
   - Create, update, delete todos
   - Test categories and tags
   - Try different view modes

3. **Advanced Features**
   - Enable 2FA
   - Test real-time updates (open in two tabs)
   - Export todos
   - Test offline mode

### 3. Set up Monitoring

1. **Sentry**
   - Create projects for frontend and backend
   - Add DSNs to environment variables
   - Test error reporting

2. **Uptime Monitoring**
   - Use Render's built-in monitoring
   - Set up external monitoring (UptimeRobot, etc.)

### 4. Configure Backups

1. **Database Backups**
   - Render provides daily backups on paid plans
   - Set up additional backup strategy if needed

2. **Redis Persistence**
   - Configure Redis persistence in Render
   - Note: Free tier has limitations

## Scaling Considerations

### When to Upgrade

1. **Database**: When you exceed connection limits or storage
2. **Redis**: When you need persistence or more memory
3. **Backend**: When response times slow down
4. **Frontend**: Vercel scales automatically

### Performance Optimization

1. **Enable CDN** for static assets
2. **Configure caching** headers
3. **Optimize images** with Vercel's image optimization
4. **Enable compression** on backend

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify FRONTEND_URL and CORS_ORIGIN match exactly
   - Include protocol (https://)
   - No trailing slashes

2. **WebSocket Connection Failed**
   - Ensure WSS protocol for production
   - Check firewall rules
   - Verify authentication

3. **Database Connection Issues**
   - Use internal URLs for Render services
   - Check connection pool settings
   - Verify SSL requirements

4. **Email Not Sending**
   - Verify SMTP credentials
   - Check spam folders
   - Review email provider logs

### Debug Commands

```bash
# Check backend logs
render logs todo-api --tail

# Check database connectivity
npx prisma db pull

# Test WebSocket connection
wscat -c wss://todo-api.onrender.com
```

## Security Checklist

- [ ] Strong JWT secrets (32+ characters)
- [ ] HTTPS enabled on all services
- [ ] Environment variables properly set
- [ ] Database using SSL
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Input validation active
- [ ] XSS protection enabled
- [ ] SQL injection prevention
- [ ] Secure headers configured

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review error logs
   - Check performance metrics
   - Monitor disk usage

2. **Monthly**
   - Update dependencies
   - Review security alerts
   - Optimize database

3. **Quarterly**
   - Load testing
   - Security audit
   - Backup recovery test

## Cost Estimation

### Free Tier Limits

**Render.com:**
- Web Service: 750 hours/month
- PostgreSQL: 1GB storage, 1GB RAM
- Redis: 25MB RAM

**Vercel:**
- 100GB bandwidth
- Unlimited deployments
- Serverless functions

### Paid Upgrades

- Backend: $7/month (Starter)
- Database: $7/month (Starter)
- Redis: $7/month (Starter)
- Total: ~$21/month for production-ready setup

## Support

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our community for help

---

🎉 Congratulations! Your TODO app is now live and ready for users!