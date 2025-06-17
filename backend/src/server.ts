import { buildApp, gracefulShutdown } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { SocketIOServer } from './realtime';
import { createServer } from 'http';

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: config.app.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Global variables for cleanup
let socketServer: SocketIOServer | null = null;

// Main function
const main = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');
    
    // Run migrations in production
    if (process.env['NODE_ENV'] === 'production') {
      try {
        const { execSync } = require('child_process');
        logger.info('Running database migrations...');
        execSync('npx prisma migrate deploy', { stdio: 'inherit' });
        logger.info('Database migrations completed');
      } catch (error) {
        logger.error('Migration failed:', error);
        // Continue anyway - migrations might already be applied
      }
    }

    // Build and start the app
    const app = await buildApp(prisma);
    
    // Register routes
    const authRoutes = await import('./api/routes/auth.routes');
    const todoRoutes = await import('./api/routes/todo.routes');
    const categoryRoutes = await import('./api/routes/category.routes');
    const tagRoutes = await import('./api/routes/tag.routes');
    const exportRoutes = await import('./api/routes/export.routes');
    
    await app.register(authRoutes.default, { prefix: `/api/${config.app.version}/auth` });
    await app.register(todoRoutes.default, { prefix: `/api/${config.app.version}/todos` });
    await app.register(categoryRoutes.default, { prefix: `/api/${config.app.version}/categories` });
    await app.register(tagRoutes.default, { prefix: `/api/${config.app.version}/tags` });
    await app.register(exportRoutes.default, { prefix: `/api/${config.app.version}/exports` });
    
    // Create HTTP server
    const httpServer = createServer(app.server);
    
    // Initialize Socket.IO
    socketServer = new SocketIOServer(httpServer, app);
    
    // Setup Redis adapter if available
    if (config.redis?.url) {
      await socketServer.setupRedisAdapter(config.redis.url);
    }
    
    // Start the server
    await new Promise<void>((resolve) => {
      httpServer.listen(config.app.port, '0.0.0.0', () => {
        resolve();
      });
    });

    logger.info(`Server running at http://localhost:${config.app.port}`);
    logger.info(`WebSocket server running on the same port`);
    logger.info(`API documentation available at http://localhost:${config.app.port}/api/${config.app.version}/docs`);

    // Handle graceful shutdown
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, shutting down...`);
        
        // Close Socket.IO server
        if (socketServer) {
          await socketServer.close();
        }
        
        await prisma.$disconnect();
        await gracefulShutdown(app);
      });
    });
  } catch (error) {
    logger.fatal(error, 'Failed to start server');
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.fatal(err, 'Unhandled rejection');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.fatal(err, 'Uncaught exception');
  process.exit(1);
});

// Start the server
main();