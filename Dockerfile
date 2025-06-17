# Dockerfile for Fly.io deployment
FROM node:20-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY shared ./shared

# Install all dependencies (skip husky in production)
ENV HUSKY=0
RUN npm ci --omit=dev || npm ci --only=production
RUN cd backend && npm ci

# Copy backend source
COPY backend ./backend

# Generate Prisma client and build
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache tini

WORKDIR /app

# Copy built application
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/shared ./shared

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

WORKDIR /app/backend

# Expose port
EXPOSE 8080

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/server.js"]