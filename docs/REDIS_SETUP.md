# Redis Setup for TODO App

Since Render's free tier doesn't support persistent disks, you'll need to use an external Redis service. Here are free options:

## Option 1: Upstash (Recommended)

1. Go to [Upstash](https://upstash.com/)
2. Sign up for a free account
3. Create a new Redis database
4. Choose the closest region to your Render deployment
5. Copy the Redis URL from the dashboard
6. Add it to your Render environment variables as `REDIS_URL`

**Free tier includes:**
- 10,000 commands per day
- 256MB storage
- SSL/TLS encryption
- Perfect for small to medium apps

## Option 2: Redis Cloud

1. Go to [Redis Cloud](https://redis.com/try-free/)
2. Sign up for a free account
3. Create a new database
4. Choose "Free" plan (30MB)
5. Copy the connection string
6. Add it to your Render environment variables as `REDIS_URL`

**Free tier includes:**
- 30MB storage
- 30 connections
- SSL/TLS encryption

## Option 3: Railway (Alternative)

1. Go to [Railway](https://railway.app/)
2. Sign up and create a new project
3. Add Redis service
4. Copy the Redis URL
5. Add it to your Render environment variables as `REDIS_URL`

**Free tier includes:**
- $5/month credit
- Good for development

## Configuring Redis URL in Render

1. After deploying to Render, go to your service dashboard
2. Click on "Environment" tab
3. Update the `REDIS_URL` variable with your Redis connection string
4. The format should be: `redis://username:password@host:port` or `rediss://` for SSL

## Testing Redis Connection

After setting up Redis, you can test the connection:

1. Go to your Render service
2. Click on "Shell" tab
3. Run: `npm run test:redis` (if available)

## What Redis is Used For

In this TODO app, Redis powers:
- Session management (login sessions)
- Real-time WebSocket connections
- Rate limiting
- Export job queue
- Caching for performance
- Presence indicators (who's online)

Without Redis, these features will be disabled but the core TODO functionality will still work.