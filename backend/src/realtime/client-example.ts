/**
 * Example Socket.io client for testing real-time features
 * Run with: npx tsx src/realtime/client-example.ts
 */

import { io, Socket } from 'socket.io-client';
import type { 
  ClientToServerEvents, 
  ServerToClientEvents,
  SocketResponse 
} from './types';

// Configuration
const SERVER_URL = process.env['SERVER_URL'] || 'http://localhost:8000';
const AUTH_TOKEN = process.env['AUTH_TOKEN'] || 'your-jwt-token-here';

// Create typed socket
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
  auth: {
    token: AUTH_TOKEN
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server');
  console.log('Socket ID:', socket.id);
  
  // Update presence
  socket.emit('presence:update', {
    status: 'online',
    lastActivity: new Date(),
    device: 'test-client'
  });
  
  // Subscribe to updates
  socket.emit('todo:subscribe');
  socket.emit('activity:subscribe');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('error', (error) => {
  console.error('🚨 Socket error:', error);
});

// Todo events
socket.on('todo:created', (todo) => {
  console.log('📝 New todo created:', {
    id: todo.id,
    title: todo.title,
    priority: todo.priority
  });
});

socket.on('todo:updated', (todo) => {
  console.log('✏️  Todo updated:', {
    id: todo.id,
    title: todo.title,
    completed: todo.completed
  });
});

socket.on('todo:deleted', (todoId) => {
  console.log('🗑️  Todo deleted:', todoId);
});

socket.on('todo:reordered', (data) => {
  console.log('🔄 Todo reordered:', data);
});

// Presence events
socket.on('presence:online', (userId, status) => {
  console.log('👤 User online:', { userId, status: status.status });
});

socket.on('presence:offline', (userId) => {
  console.log('👤 User offline:', userId);
});

socket.on('presence:typing', (indicator) => {
  if (indicator.isTyping) {
    console.log('⌨️  User typing:', indicator.userId, 'on todo:', indicator.todoId);
  } else {
    console.log('⌨️  User stopped typing:', indicator.userId);
  }
});

// Notification events
socket.on('notification', (notification) => {
  console.log('🔔 Notification:', {
    type: notification.type,
    title: notification.title,
    message: notification.message
  });
});

// Activity feed
socket.on('activity:feed', (activity: any) => {
  console.log('📊 Activity:', {
    action: activity.action,
    entity: `${activity.entityType}:${activity.entityTitle}`,
    user: activity.userId,
    time: activity.timestamp
  });
});

// Test functions
async function testCreateTodo() {
  console.log('\n🧪 Testing todo creation...');
  
  socket.emit('todo:create', {
    title: 'Test Todo from Socket Client',
    content: 'This is a test todo created via WebSocket',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000).toISOString() // Tomorrow
  }, (response: SocketResponse) => {
    if (response.success) {
      console.log('✅ Todo created successfully:', response.data);
      return response.data;
    } else {
      console.error('❌ Failed to create todo:', response.error);
    }
  });
}

async function testUpdateTodo(todoId: string) {
  console.log('\n🧪 Testing todo update...');
  
  socket.emit('todo:update', {
    id: todoId,
    title: 'Updated Test Todo',
    completed: true
  }, (response: SocketResponse) => {
    if (response.success) {
      console.log('✅ Todo updated successfully');
    } else {
      console.error('❌ Failed to update todo:', response.error);
    }
  });
}

async function testTypingIndicator(todoId: string) {
  console.log('\n🧪 Testing typing indicator...');
  
  socket.emit('presence:typing:start', todoId);
  console.log('Started typing...');
  
  setTimeout(() => {
    socket.emit('presence:typing:stop', todoId);
    console.log('Stopped typing');
  }, 3000);
}

// Interactive CLI
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu() {
  console.log('\n📋 WebSocket Test Menu:');
  console.log('1. Create a test todo');
  console.log('2. Update a todo (need todo ID)');
  console.log('3. Delete a todo (need todo ID)');
  console.log('4. Test typing indicator');
  console.log('5. Update presence status');
  console.log('6. Exit');
  
  rl.question('\nSelect an option: ', async (choice) => {
    switch (choice) {
      case '1':
        await testCreateTodo();
        setTimeout(showMenu, 1000);
        break;
        
      case '2':
        rl.question('Enter todo ID: ', async (todoId) => {
          await testUpdateTodo(todoId);
          setTimeout(showMenu, 1000);
        });
        break;
        
      case '3':
        rl.question('Enter todo ID: ', (todoId) => {
          socket.emit('todo:delete', todoId, (response: SocketResponse) => {
            if (response.success) {
              console.log('✅ Todo deleted successfully');
            } else {
              console.error('❌ Failed to delete todo:', response.error);
            }
          });
          setTimeout(showMenu, 1000);
        });
        break;
        
      case '4':
        rl.question('Enter todo ID: ', async (todoId) => {
          await testTypingIndicator(todoId);
          setTimeout(showMenu, 4000);
        });
        break;
        
      case '5':
        console.log('Select status: 1=online, 2=away, 3=busy, 4=offline');
        rl.question('Status: ', (status) => {
          const statusMap: Record<string, string> = {
            '1': 'online',
            '2': 'away',
            '3': 'busy',
            '4': 'offline'
          };
          socket.emit('presence:update', {
            status: statusMap[status] || 'online',
            lastActivity: new Date()
          });
          console.log('✅ Presence updated');
          setTimeout(showMenu, 1000);
        });
        break;
        
      case '6':
        console.log('👋 Goodbye!');
        socket.close();
        process.exit(0);
        break;
        
      default:
        console.log('❌ Invalid option');
        showMenu();
    }
  });
}

// Start the interactive menu after connection
socket.on('connect', () => {
  setTimeout(showMenu, 1000);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  socket.close();
  process.exit(0);
});