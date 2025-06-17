import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface SeedUser {
  email: string;
  password: string;
  name: string;
}

interface SeedTodo {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  tags: string[];
}

const testUsers: SeedUser[] = [
  {
    email: 'test.user1@example.com',
    password: 'TestPass123!',
    name: 'Test User 1',
  },
  {
    email: 'test.user2@example.com',
    password: 'TestPass123!',
    name: 'Test User 2',
  },
  {
    email: 'test.admin@example.com',
    password: 'AdminPass123!',
    name: 'Test Admin',
  },
];

const generateTodos = (count: number): SeedTodo[] => {
  const todos: SeedTodo[] = [];
  const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const statuses: ('pending' | 'in_progress' | 'completed')[] = ['pending', 'in_progress', 'completed'];
  const tags = ['work', 'personal', 'urgent', 'shopping', 'health', 'learning', 'project'];

  for (let i = 0; i < count; i++) {
    const priority = priorities[i % 3];
    const status = statuses[i % 3];
    const tagCount = Math.floor(Math.random() * 3) + 1;
    const selectedTags = tags.sort(() => 0.5 - Math.random()).slice(0, tagCount);

    todos.push({
      title: `Test Todo ${i + 1}`,
      description: i % 2 === 0 ? `Description for todo ${i + 1}` : undefined,
      priority,
      status,
      dueDate: i % 3 === 0 ? new Date(Date.now() + (i * 24 * 60 * 60 * 1000)) : undefined,
      tags: selectedTags,
    });
  }

  return todos;
};

async function seedTestData() {
  console.log('🌱 Starting test data seeding...');

  try {
    // Clean existing data
    console.log('Cleaning existing data...');
    await prisma.todo.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    console.log('Creating test users...');
    const createdUsers = [];

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
        },
      });
      createdUsers.push(user);
      console.log(`Created user: ${user.email}`);
    }

    // Create todos for each user
    console.log('Creating test todos...');
    const todosPerUser = 30;

    for (const user of createdUsers) {
      const todos = generateTodos(todosPerUser);
      
      for (const todoData of todos) {
        await prisma.todo.create({
          data: {
            ...todoData,
            userId: user.id,
            completedAt: todoData.status === 'completed' 
              ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
              : null,
          },
        });
      }

      console.log(`Created ${todosPerUser} todos for user: ${user.email}`);
    }

    // Create some shared todos (if your schema supports it)
    // This is for testing collaboration features
    
    console.log('✅ Test data seeding completed!');
    
    // Print summary
    const userCount = await prisma.user.count();
    const todoCount = await prisma.todo.count();
    
    console.log('\nSummary:');
    console.log(`- Users created: ${userCount}`);
    console.log(`- Todos created: ${todoCount}`);
    console.log('\nTest credentials:');
    testUsers.forEach(user => {
      console.log(`- Email: ${user.email}, Password: ${user.password}`);
    });

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedTestData()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedTestData };