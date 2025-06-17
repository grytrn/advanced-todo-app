# One-Click Render Deployment Guide

This TODO app is configured for easy deployment on Render using their Blueprint feature.

## Quick Deploy (Recommended)

### Option 1: Deploy via Render Dashboard

1. **Fork or push this repository to GitHub**

2. **Click this button to deploy:**
   
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

3. **Or manually in Render Dashboard:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Select the repository containing `render.yaml`
   - Click "Apply"

### Option 2: Deploy via Render CLI

```bash
# Install Render CLI
brew install render/render/render

# Login to Render
render login

# Deploy the blueprint
render blueprint deploy
```

## Post-Deployment Configuration

After deployment, you need to configure these environment variables in the Render Dashboard:

### 1. Update Frontend URL
- Go to your backend service in Render
- Update `FRONTEND_URL` to your actual Vercel URL

### 2. Email Configuration (for password reset & notifications)
```
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com
```

For Gmail:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use that password for `SMTP_PASS`

### 3. OAuth Configuration (optional)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret
```

### 4. Sentry Error Tracking (optional)
```
SENTRY_DSN=your-sentry-dsn
```

### 5. File Storage (optional)
```
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket-name
```

## Database Access

Your PostgreSQL database is automatically provisioned. To access it:

1. Go to your database service in Render Dashboard
2. Click "Connect" to get connection details
3. Use any PostgreSQL client (pgAdmin, TablePlus, etc.)

## Running Migrations

Migrations run automatically on deploy. To run manually:

1. Go to your backend service
2. Click "Shell" tab
3. Run: `npm run migrate`

## Monitoring

- **Logs**: Available in each service's dashboard
- **Metrics**: CPU, Memory, and Disk usage shown in dashboard
- **Health Checks**: Configured at `/api/v1/health`

## Scaling

The free tier includes:
- 750 hours/month of runtime (enough for 1 service 24/7)
- 100GB bandwidth
- 512MB RAM per service
- PostgreSQL with 1GB storage

To scale:
1. Upgrade to a paid plan
2. Increase service instances
3. Add more workers for background jobs

## Troubleshooting

### Common Issues

1. **Build fails**: Check build logs, ensure all dependencies are in `package.json`
2. **Database connection fails**: Verify `DATABASE_URL` is set correctly
3. **Redis connection fails**: Check Redis service is running
4. **Frontend can't reach backend**: Update `FRONTEND_URL` and CORS settings

### Useful Commands (in Shell)

```bash
# Check logs
npm run start:prod

# Run migrations
npm run migrate

# Check database connection
npm run prisma db push

# Generate Prisma client
npm run generate
```

## Frontend Deployment

While the backend is on Render, deploy your frontend to Vercel:

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variable:
   ```
   VITE_API_URL=https://todo-app-backend.onrender.com
   ```
4. Deploy!

## Custom Domain

To add a custom domain:
1. Go to your service settings
2. Add your domain
3. Update DNS records as shown
4. SSL certificates are automatic

## Blueprint Structure

The `render.yaml` file defines:
- PostgreSQL database (free tier)
- Redis instance (free tier)
- Backend API service
- Environment variables
- Auto-deploy from GitHub
- Health checks

You can modify this file to:
- Add more services
- Change resource allocations
- Add custom domains
- Configure build/start commands

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Status Page](https://status.render.com)

Happy deploying! 🚀