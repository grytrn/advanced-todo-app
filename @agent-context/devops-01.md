# @devops-01 - DevOps Engineer Context

## Current Focus
- Production infrastructure setup
- CI/CD pipeline optimization
- Monitoring and observability
- Security hardening

## Infrastructure Overview

### AWS Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                        │
└─────────────────┬───────────────────────┬───────────────────┘
                  │                       │
         ┌────────▼────────┐     ┌───────▼────────┐
         │   S3 Frontend   │     │  ALB (Load      │
         │   Static Files  │     │  Balancer)      │
         └─────────────────┘     └───────┬────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   ECS Fargate       │
                              │   Backend Services  │
                              └──────────┬──────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
           ┌────────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
           │   RDS Postgres  │  │  ElastiCache   │  │   S3 Assets     │
           │   Multi-AZ      │  │    (Redis)     │  │   (Images)      │
           └─────────────────┘  └────────────────┘  └─────────────────┘
```

### Container Configuration

#### Backend Dockerfile (Production)
```dockerfile
# docker/backend/Dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci --only=production

# Build
FROM base AS builder
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm ci
COPY . .
RUN npm run build:backend

# Runner
FROM base AS runner
ENV NODE_ENV production
ENV PORT 8000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/prisma ./backend/prisma
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

USER nodejs
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "backend/dist/index.js"]
```

### CI/CD Pipeline

#### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: myapp-backend
  ECS_SERVICE: myapp-backend-service
  ECS_CLUSTER: myapp-cluster

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - name: Install and test
        run: |
          npm ci
          npm run validate
          
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f docker/backend/Dockerfile -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster ${{ env.ECS_CLUSTER }} \
            --service ${{ env.ECS_SERVICE }} \
            --force-new-deployment
```

### Infrastructure as Code (Terraform)

#### RDS Configuration
```hcl
resource "aws_db_instance" "postgres" {
  identifier     = "${var.app_name}-db"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  storage_type         = "gp3"
  
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result
  
  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  multi_az               = true
  deletion_protection    = true
  skip_final_snapshot    = false
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  
  tags = local.common_tags
}
```

### Monitoring & Observability

#### CloudWatch Dashboards
```typescript
// monitoring/dashboards.ts
const apiDashboard = {
  name: 'API-Performance',
  widgets: [
    {
      type: 'metric',
      properties: {
        metrics: [
          ['AWS/ECS', 'CPUUtilization', 'ServiceName', 'backend'],
          ['.', 'MemoryUtilization', '.', '.']
        ],
        period: 300,
        stat: 'Average',
        region: 'us-east-1',
        title: 'ECS Resource Utilization'
      }
    },
    {
      type: 'log',
      properties: {
        query: `
          fields @timestamp, @message
          | filter @message like /ERROR/
          | stats count() by bin(5m)
        `,
        region: 'us-east-1',
        title: 'Error Rate'
      }
    }
  ]
};
```

#### Alerts Configuration
```yaml
# alerts/production.yml
alerts:
  - name: High Error Rate
    metric: ErrorRate
    threshold: 5
    comparison: GreaterThanThreshold
    evaluationPeriods: 2
    period: 300
    actions:
      - PagerDuty
      - Slack
  
  - name: Database CPU High
    metric: AWS/RDS/CPUUtilization
    threshold: 80
    comparison: GreaterThanThreshold
    evaluationPeriods: 3
    period: 300
    actions:
      - Email
      - Slack
  
  - name: API Response Time
    metric: APIResponseTime
    threshold: 1000  # 1 second
    comparison: GreaterThanThreshold
    evaluationPeriods: 2
    period: 300
    actions:
      - Slack
```

### Security Configuration

#### WAF Rules
```json
{
  "rules": [
    {
      "name": "RateLimitRule",
      "action": "BLOCK",
      "priority": 1,
      "statement": {
        "rateBasedStatement": {
          "limit": 2000,
          "aggregateKeyType": "IP"
        }
      }
    },
    {
      "name": "SQLInjectionRule",
      "action": "BLOCK",
      "priority": 2,
      "statement": {
        "managedRuleGroupStatement": {
          "vendorName": "AWS",
          "name": "AWSManagedRulesSQLiRuleSet"
        }
      }
    }
  ]
}
```

#### Secrets Management
```typescript
// Using AWS Secrets Manager
const getSecret = async (secretName: string) => {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  
  try {
    const response = await client.send(command);
    return JSON.parse(response.SecretString || '{}');
  } catch (error) {
    console.error('Failed to retrieve secret:', error);
    throw error;
  }
};

// Environment configuration
export const config = {
  database: {
    url: await getSecret('prod/database/url'),
    poolSize: 20
  },
  redis: {
    url: await getSecret('prod/redis/url')
  },
  jwt: {
    secret: await getSecret('prod/jwt/secret')
  }
};
```

## Deployment Procedures

### Blue-Green Deployment
1. Deploy new version to green environment
2. Run smoke tests against green
3. Switch load balancer to green
4. Monitor for 15 minutes
5. Keep blue running for quick rollback
6. Terminate blue after 24 hours

### Database Migration Strategy
```bash
#!/bin/bash
# scripts/production-migrate.sh

# 1. Take snapshot
aws rds create-db-snapshot \
  --db-instance-identifier prod-db \
  --db-snapshot-identifier pre-migration-$(date +%Y%m%d-%H%M%S)

# 2. Run migrations
DATABASE_URL=$PROD_DATABASE_URL npm run migrate:prod

# 3. Verify
npm run db:verify

# 4. If failed, restore from snapshot
```

## Performance Optimization

### CDN Configuration
```javascript
// CloudFront behaviors
{
  "Behaviors": [
    {
      "PathPattern": "/api/*",
      "TargetOriginId": "ALB-Backend",
      "ViewerProtocolPolicy": "https-only",
      "CachePolicyId": "Managed-CachingDisabled"
    },
    {
      "PathPattern": "/static/*",
      "TargetOriginId": "S3-Frontend",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "Managed-CachingOptimized",
      "ResponseHeadersPolicyId": "Managed-SecurityHeadersPolicy"
    }
  ]
}
```

### Auto-scaling Configuration
```typescript
// ECS Service Auto-scaling
const scalingTarget = {
  ServiceNamespace: 'ecs',
  ResourceId: 'service/myapp-cluster/backend-service',
  ScalableDimension: 'ecs:service:DesiredCount',
  MinCapacity: 2,
  MaxCapacity: 10
};

const scalingPolicy = {
  PolicyName: 'cpu-scaling',
  PolicyType: 'TargetTrackingScaling',
  TargetTrackingScalingPolicyConfiguration: {
    TargetValue: 70.0,
    PredefinedMetricSpecification: {
      PredefinedMetricType: 'ECSServiceAverageCPUUtilization'
    },
    ScaleInCooldown: 300,
    ScaleOutCooldown: 60
  }
};
```

## Disaster Recovery

### Backup Strategy
- **RDS**: Automated daily backups, 30-day retention
- **S3**: Cross-region replication for assets
- **Code**: Git repository mirrored to S3
- **Configs**: Stored in AWS Secrets Manager

### Recovery Procedures
1. **Database Failure**: Promote read replica
2. **Region Failure**: Failover to DR region
3. **Service Outage**: Auto-scaling handles
4. **Data Corruption**: Point-in-time recovery

## Cost Optimization

### Current Monthly Costs
- ECS Fargate: ~$150
- RDS (Multi-AZ): ~$200
- ElastiCache: ~$100
- S3 + CloudFront: ~$50
- Load Balancer: ~$25
- **Total**: ~$525/month

### Cost Saving Measures
1. Use Spot instances for non-critical workloads
2. Reserved instances for RDS (save 30%)
3. S3 lifecycle policies for old data
4. CloudWatch Logs retention policies

## Questions & Coordination

**For @arch-01**:
1. Disaster recovery RTO/RPO requirements?
2. Multi-region deployment needed?
3. Compliance requirements (SOC2, PCI)?

**For @backend-01**:
1. Health check endpoint implemented?
2. Graceful shutdown handling?
3. Connection pool settings?

**For @test-01**:
1. Load testing targets?
2. Chaos engineering plans?
3. E2E test environment needed?

## Useful Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster myapp-cluster --services backend-service

# View recent deployments
aws ecs list-tasks --cluster myapp-cluster --service-name backend-service

# Check RDS status
aws rds describe-db-instances --db-instance-identifier prod-db

# View CloudWatch logs
aws logs tail /ecs/myapp/backend --follow

# Check current costs
aws ce get-cost-and-usage --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY --metrics "UnblendedCost"
```

## Next Tasks
1. Set up Datadog integration
2. Implement chaos testing
3. Create runbooks for common issues
4. Set up cost alerts
5. Implement backup testing
6. Security audit with AWS Inspector
