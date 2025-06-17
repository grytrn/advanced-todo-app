# Deploying TODO App to Fly.io

This guide walks you through deploying the TODO app backend to Fly.io with PostgreSQL and Redis.

## Prerequisites

1. Create a [Fly.io account](https://fly.io/app/sign-up) (free)
2. Install Fly CLI:
   ```bash
   # macOS
   brew install flyctl

   # Linux
   curl -L https://fly.io/install.sh | sh

   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

## Step 1: Login and Launch

```bash
# Login to Fly
fly auth login

# Launch the app (from project root)
fly launch
```

When prompted:
- App name: Choose a unique name or accept the suggestion
- Region: Choose the closest to you (e.g., `iad` for US East)
- Would you like to set up PostgreSQL? **YES**
- Would you like to set up Redis? **YES**

## Step 2: Set Environment Variables

```bash
# Generate secrets
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
CSRF_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# Set secrets in Fly
fly secrets set JWT_ACCESS_SECRET="$JWT_ACCESS_SECRET"
fly secrets set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
fly secrets set CSRF_SECRET="$CSRF_SECRET"
fly secrets set SESSION_SECRET="$SESSION_SECRET"

# Set other environment variables
fly secrets set FRONTEND_URL="https://your-frontend-url.com"
fly secrets set EMAIL_FROM="noreply@yourdomain.com"

# Email configuration (if using Gmail)
fly secrets set SMTP_HOST="smtp.gmail.com"
fly secrets set SMTP_PORT="587"
fly secrets set SMTP_USER="your-email@gmail.com"
fly secrets set SMTP_PASS="your-app-password"

# Optional: OAuth
fly secrets set GOOGLE_CLIENT_ID="your-google-client-id"
fly secrets set GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## Step 3: Database Setup

Fly automatically creates a PostgreSQL instance. Get the connection info:

```bash
# Show database info
fly postgres attach --app todo-app-backend

# The DATABASE_URL is automatically set
```

For Redis (if not automatically created):

```bash
# Create Redis instance
fly redis create

# Get Redis URL
fly redis status

# Set Redis URL
fly secrets set REDIS_URL="redis://default:password@your-redis.fly.dev"
```

## Step 4: Deploy

```bash
# Deploy the app
fly deploy

# Check deployment status
fly status

# View logs
fly logs
```

## Step 5: Run Database Migrations

```bash
# SSH into the app
fly ssh console

# Run migrations
cd backend
npx prisma migrate deploy

# Exit SSH
exit
```

## Step 6: Access Your App

```bash
# Get your app URL
fly info

# Open in browser
fly open
```

Your backend will be available at: `https://todo-app-backend.fly.dev`

## Deploying the Frontend

For the frontend, you have options:

### Option 1: Deploy Frontend to Fly.io (Static)

Create `frontend/fly.toml`:

```toml
app = "todo-app-frontend"
primary_region = "iad"

[build]
  builder = "static"
  buildpacks = ["https://github.com/heroku/heroku-buildpack-nodejs"]

[build.args]
  NODE_VERSION = "20"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

Deploy:
```bash
cd frontend
fly launch
fly deploy
```

### Option 2: Deploy Frontend to Vercel (Recommended)

```bash
cd frontend
npm i -g vercel
vercel
```

Set environment variable:
- `VITE_API_URL` = `https://todo-app-backend.fly.dev`

## Monitoring and Management

```bash
# View logs
fly logs

# SSH into container
fly ssh console

# Scale up/down
fly scale count 2  # Run 2 instances
fly scale count 1  # Back to 1

# View secrets
fly secrets list

# Monitor resources
fly dashboard
```

## Troubleshooting

### If deployment fails:
```bash
# Check build logs
fly logs

# Check secrets are set
fly secrets list

# Ensure health check passes
curl https://your-app.fly.dev/api/v1/health
```

### If database connection fails:
```bash
# Check DATABASE_URL is set
fly ssh console
echo $DATABASE_URL

# Test connection
fly postgres connect -a your-postgres-app
```

## Custom Domain

To add a custom domain:

```bash
# Add certificate
fly certs add yourdomain.com

# Show DNS instructions
fly certs show yourdomain.com
```

## Costs

Fly.io free tier includes:
- 3 shared-cpu-1x VMs with 256MB RAM
- 3GB persistent storage
- 160GB outbound data transfer

This is enough for a small TODO app with low traffic.

## Next Steps

1. Set up monitoring with `fly metrics`
2. Configure auto-scaling if needed
3. Set up backup strategy for PostgreSQL
4. Consider using Fly's built-in metrics and logging

Happy deploying! 🚀