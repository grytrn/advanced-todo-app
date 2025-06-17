# Backend Dockerfile with multi-stage build

# Development stage
FROM node:20-alpine AS development

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code and shared types
COPY . .
COPY --from=shared /shared ./shared

# Generate Prisma client
RUN npx prisma generate

# Expose port and debugger
EXPOSE 8000 9229

# Development command
CMD ["npm", "run", "dev"]

# Build stage
FROM node:20-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Generate Prisma client for production
RUN npx prisma generate

# Copy shared types
COPY --chown=nodejs:nodejs ../shared ./shared

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"
