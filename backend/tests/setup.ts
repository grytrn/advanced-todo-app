import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Test database client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Global test setup
beforeAll(async () => {
  // Ensure we're using test database
  if (!process.env.DATABASE_URL?.includes('test_db')) {
    throw new Error('Test database URL must contain "test_db"');
  }
  
  // Run migrations
  console.log('Running migrations...');
  // await execSync('npx prisma migrate deploy', { stdio: 'inherit' });
});

// Clean database before each test
beforeEach(async () => {
  // Clean database in correct order to avoid foreign key constraints
  const tables = ['Todo', 'User'];
  
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }
});

// Clean up after each test
afterEach(async () => {
  // Any test-specific cleanup
});

// Global teardown
afterAll(async () => {
  await prisma.$disconnect();
});